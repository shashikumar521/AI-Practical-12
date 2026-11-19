"""
OpenAI API integration module for generating two genuinely distinct stylistic answers.

All API keys remain strictly on the Python backend via environment variables.
Never expose OPENAI_API_KEY to the React frontend.
"""

from __future__ import annotations

import json
import os
import re
from typing import Dict, Tuple

from openai import APIConnectionError, APIError, APITimeoutError, AuthenticationError, OpenAI, RateLimitError

STYLE_INSTRUCTIONS: Dict[str, str] = {
    "Simple Explanation": (
        "Use everyday, plain language and intuitive metaphors. Avoid technical jargon, "
        "equations, and dense academic phrasing. Aim for effortless clarity."
    ),
    "Detailed Explanation": (
        "Provide a thorough, comprehensive explanation that covers underlying mechanisms, "
        "important nuances, edge cases, and practical implications in well-structured sections."
    ),
    "Technical Explanation": (
        "Use precise engineering/scientific terminology, formal definitions, mathematical or "
        "algorithmic notation where relevant, architectural trade-offs, and exact constraints."
    ),
    "Example-Based Explanation": (
        "Teach primarily through 2-3 vivid, concrete real-world examples or worked scenarios. "
        "Show the concept in action rather than staying abstract."
    ),
    "Short Answer": (
        "Be ultra-concise and high-signal. Answer directly in 2-4 crisp sentences or a tight "
        "3-bullet summary without fluff or preamble."
    ),
    "Step-by-Step Explanation": (
        "Break the answer down into a clear, numbered sequential progression (Step 1, Step 2, ...) "
        "moving logically from first principles to the final result."
    ),
    "Professional Explanation": (
        "Adopt an executive, polished, business-ready tone. Lead with an executive takeaway, "
        "use structured impact points, and maintain formal clarity."
    ),
    "Beginner-Friendly Explanation": (
        "Assume zero prior knowledge. Start from the absolute basics, define any term you "
        "introduce gently, and use encouraging, accessible teaching language."
    ),
}


class AIServiceError(Exception):
    """Structured domain error raised when AI generation fails safely."""

    def __init__(self, message: str, code: str = "AI_ERROR", status_code: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class AIService:
    """Wrapper around OpenAI Chat Completions returning structured dual answers."""

    def __init__(self) -> None:
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"

    def is_configured(self) -> bool:
        key = os.getenv("OPENAI_API_KEY", "").strip()
        return bool(key and key not in ("your_openai_api_key_here", "MY_OPENAI_API_KEY"))

    def _get_client(self) -> OpenAI:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key or api_key in ("your_openai_api_key_here", "MY_OPENAI_API_KEY"):
            raise AIServiceError(
                "OPENAI_API_KEY is not configured on the Flask backend. "
                "Add a valid OPENAI_API_KEY to backend/.env (or environment variables) and restart Flask.",
                code="MISSING_API_KEY",
                status_code=503,
            )
        return OpenAI(api_key=api_key, timeout=45.0)

    @staticmethod
    def _parse_json_response(raw_text: str) -> Tuple[str, str]:
        cleaned = raw_text.strip()
        # Strip markdown code fences if present
        fence_match = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", cleaned, re.IGNORECASE)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            # Attempt substring extraction if surrounding prose leaked
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    data = json.loads(cleaned[start : end + 1])
                except json.JSONDecodeError:
                    raise AIServiceError(
                        "The AI model returned a malformed JSON response. Please retry your question.",
                        code="INVALID_AI_RESPONSE",
                        status_code=502,
                    ) from exc
            else:
                raise AIServiceError(
                    "The AI model returned an unstructured response. Please retry your question.",
                    code="INVALID_AI_RESPONSE",
                    status_code=502,
                ) from exc

        if not isinstance(data, dict):
            raise AIServiceError(
                "Unexpected response format from AI provider.",
                code="INVALID_AI_RESPONSE",
                status_code=502,
            )

        answer_a = str(data.get("answer_a", "")).strip()
        answer_b = str(data.get("answer_b", "")).strip()

        if not answer_a or not answer_b:
            raise AIServiceError(
                "The AI model returned an incomplete dual response. Please try again.",
                code="INVALID_AI_RESPONSE",
                status_code=502,
            )

        return answer_a, answer_b

    def generate_dual_answers(
        self, question: str, style_a: str, style_b: str
    ) -> Dict[str, str]:
        """Call OpenAI API to produce two genuinely distinct answers in JSON."""
        client = self._get_client()

        instr_a = STYLE_INSTRUCTIONS.get(style_a, f"Write in a {style_a} style.")
        instr_b = STYLE_INSTRUCTIONS.get(style_b, f"Write in a {style_b} style.")

        system_prompt = (
            "You are PreferenceAI, a dual-response generator used for human preference learning. "
            "For every user question, you MUST generate TWO genuinely distinct, high-quality answers "
            "that strongly embody the two requested stylistic profiles in structure, vocabulary, "
            "depth, and formatting—not merely superficial rewording.\n\n"
            "Return ONLY a valid JSON object with exactly two string keys:\n"
            '{"answer_a": "...", "answer_b": "..."}'
        )

        user_prompt = (
            f"User Question:\n{question}\n\n"
            f"Style A ({style_a}):\n{instr_a}\n\n"
            f"Style B ({style_b}):\n{instr_b}\n\n"
            "Generate answer_a strictly following Style A and answer_b strictly following Style B. "
            "Use clean plain text or lightweight markdown (paragraphs, bullet points, or short code blocks "
            "when relevant) inside the JSON strings. Do not include the style name as a title prefix."
        )

        try:
            completion = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.75,
                response_format={"type": "json_object"},
            )
        except AuthenticationError as exc:
            raise AIServiceError(
                "OpenAI authentication failed. Check that OPENAI_API_KEY in backend/.env is valid.",
                code="INVALID_API_KEY",
                status_code=401,
            ) from exc
        except RateLimitError as exc:
            raise AIServiceError(
                "OpenAI rate limit or quota exceeded. Please wait a moment or check your API billing.",
                code="RATE_LIMIT",
                status_code=429,
            ) from exc
        except (APIConnectionError, APITimeoutError) as exc:
            raise AIServiceError(
                "Unable to connect to the OpenAI API. Check network connectivity and try again.",
                code="AI_CONNECTION_ERROR",
                status_code=503,
            ) from exc
        except APIError as exc:
            raise AIServiceError(
                "The OpenAI API encountered an upstream error. Please try again shortly.",
                code="AI_API_ERROR",
                status_code=502,
            ) from exc
        except Exception as exc:
            raise AIServiceError(
                "Unexpected error communicating with the AI service.",
                code="AI_UNKNOWN_ERROR",
                status_code=500,
            ) from exc

        content = ""
        if completion.choices and completion.choices[0].message:
            content = completion.choices[0].message.content or ""

        answer_a, answer_b = self._parse_json_response(content)
        return {
            "answer_a": answer_a,
            "answer_b": answer_b,
            "model": self.model,
        }
