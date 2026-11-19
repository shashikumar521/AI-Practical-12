"""
PreferenceAI Flask Backend Server

Implements:
  - GET  /       : Health check & configuration status
  - POST /ask    : Select 2 styles via DecisionEngine and generate 2 answers via OpenAI
  - POST /choose : Record user preference and update Scikit-learn KNN model in RAM
  - GET  /stats  : Return real KNN preference scores, counts, and recent comparisons
  - POST /reset  : Clear temporary in-memory preference state
  - POST /config : Update runtime KNN neighbors (k) and exploration rate (epsilon)
"""

from __future__ import annotations

import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from modules.ai_service import AIService, AIServiceError
from modules.decision_engine import DecisionEngine
from modules.preference_model import STYLE_VECTORS, PreferenceModel

# Load backend/.env first, then project root .env if present (never overwriting existing env vars)
BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env", override=False)
load_dotenv(ROOT_DIR / ".env", override=False)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024  # 64 KB request payload limit

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"],
)

# Temporary single-user in-memory state (NO database)
preference_model = PreferenceModel(n_neighbors=3)
decision_engine = DecisionEngine(preference_model=preference_model, exploration_rate=0.30)
ai_service = AIService()

# Stores pending unchosen dual comparisons keyed by request_id
PENDING_REQUESTS: Dict[str, Dict[str, Any]] = {}
MAX_PENDING_REQUESTS = 200


def _error_response(message: str, code: str, status_code: int) -> tuple:
    return jsonify({"error": message, "code": code}), status_code


@app.errorhandler(RequestEntityTooLarge)
def handle_payload_too_large(_err: RequestEntityTooLarge):
    return _error_response("Request payload exceeds 64KB size limit.", "PAYLOAD_TOO_LARGE", 413)


@app.errorhandler(404)
def handle_not_found(_err):
    return _error_response("Endpoint not found.", "NOT_FOUND", 404)


@app.errorhandler(405)
def handle_method_not_allowed(_err):
    return _error_response("HTTP method not allowed.", "METHOD_NOT_ALLOWED", 405)


@app.route("/", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "ok",
            "service": "PreferenceAI Flask Backend",
            "tagline": "Two answers. Your choice. Smarter conversations.",
            "api_key_configured": ai_service.is_configured(),
            "model": ai_service.model,
            "comparisons": len(preference_model.comparisons),
            "model_trained": preference_model.is_trained,
            "model_status": preference_model.model_status,
            "storage": "temporary_in_memory_only",
        }
    )


@app.route("/ask", methods=["POST"])
def ask():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error_response("Invalid JSON request body.", "INVALID_REQUEST", 400)

    question = payload.get("question")
    if not isinstance(question, str) or not question.strip():
        return _error_response("Question cannot be empty.", "EMPTY_QUESTION", 400)

    clean_question = question.strip()
    if len(clean_question) > 4000:
        return _error_response(
            "Question is too long (maximum 4000 characters).", "QUESTION_TOO_LONG", 400
        )

    bias_mode = str(payload.get("bias_mode", "balanced")).strip().lower()
    if bias_mode not in ("balanced", "explore", "exploit"):
        bias_mode = "balanced"

    started = time.perf_counter()
    selection = decision_engine.select_styles(bias_mode=bias_mode)
    style_a = str(selection["style_a"])
    style_b = str(selection["style_b"])
    decision_mode = str(selection["decision_mode"])

    try:
        generated = ai_service.generate_dual_answers(clean_question, style_a, style_b)
    except AIServiceError as exc:
        return _error_response(exc.message, exc.code, exc.status_code)

    latency_ms = round((time.perf_counter() - started) * 1000)
    request_id = str(uuid.uuid4())

    # Bound in-memory pending queue to prevent unbounded memory growth
    if len(PENDING_REQUESTS) >= MAX_PENDING_REQUESTS:
        oldest_key = next(iter(PENDING_REQUESTS))
        PENDING_REQUESTS.pop(oldest_key, None)

    PENDING_REQUESTS[request_id] = {
        "request_id": request_id,
        "question": clean_question,
        "style_a": style_a,
        "style_b": style_b,
        "decision_mode": decision_mode,
        "chosen": False,
    }

    return jsonify(
        {
            "request_id": request_id,
            "style_a": style_a,
            "style_b": style_b,
            "answer_a": generated["answer_a"],
            "answer_b": generated["answer_b"],
            "decision_mode": decision_mode,
            "style_distance": selection["style_distance"],
            "style_a_vector": STYLE_VECTORS[style_a],
            "style_b_vector": STYLE_VECTORS[style_b],
            "exploration_rate": decision_engine.exploration_rate,
            "latency_ms": latency_ms,
        }
    )


@app.route("/choose", methods=["POST"])
def choose():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error_response("Invalid JSON request body.", "INVALID_REQUEST", 400)

    request_id = payload.get("request_id")
    selected = payload.get("selected")

    if not isinstance(request_id, str) or not request_id.strip():
        return _error_response("Missing request_id.", "MISSING_REQUEST_ID", 400)

    if not isinstance(selected, str) or selected.strip().upper() not in ("A", "B"):
        return _error_response("Selected answer must be 'A' or 'B'.", "INVALID_SELECTION", 400)

    pending = PENDING_REQUESTS.get(request_id)
    if pending is None:
        return _error_response(
            "Comparison not found or expired (server memory may have been reset).",
            "COMPARISON_NOT_FOUND",
            404,
        )

    if pending.get("chosen"):
        return _error_response(
            "A preference has already been recorded for this comparison.",
            "DUPLICATE_SELECTION",
            409,
        )

    try:
        record = preference_model.record_comparison(
            request_id=request_id,
            question=pending["question"],
            style_a=pending["style_a"],
            style_b=pending["style_b"],
            selected=selected.strip().upper(),
            decision_mode=pending["decision_mode"],
        )
    except ValueError as exc:
        return _error_response(str(exc), "INVALID_SELECTION", 400)

    pending["chosen"] = True

    return jsonify(
        {
            "message": "Preference learned",
            "selected_style": record["selected_style"],
            "rejected_style": record["rejected_style"],
            "learned_samples": len(preference_model.y_labels),
            "comparisons": len(preference_model.comparisons),
            "model_trained": preference_model.is_trained,
            "model_status": preference_model.model_status,
        }
    )


@app.route("/stats", methods=["GET"])
def stats():
    return jsonify(preference_model.get_stats(exploration_rate=decision_engine.exploration_rate))


@app.route("/reset", methods=["POST"])
def reset():
    PENDING_REQUESTS.clear()
    preference_model.reset()
    decision_engine.reset()
    return jsonify({"message": "Session preferences reset"})


@app.route("/config", methods=["POST"])
def update_config():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error_response("Invalid JSON request body.", "INVALID_REQUEST", 400)

    if "n_neighbors" in payload:
        try:
            k = int(payload["n_neighbors"])
        except (TypeError, ValueError):
            return _error_response("n_neighbors must be an integer.", "INVALID_CONFIG", 400)
        preference_model.set_n_neighbors(k)

    if "exploration_rate" in payload:
        try:
            eps = float(payload["exploration_rate"])
        except (TypeError, ValueError):
            return _error_response("exploration_rate must be a number.", "INVALID_CONFIG", 400)
        decision_engine.set_exploration_rate(eps)

    return jsonify(
        {
            "n_neighbors": preference_model.n_neighbors,
            "exploration_rate": decision_engine.exploration_rate,
            "model_trained": preference_model.is_trained,
        }
    )


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5000"))
    app.run(host=host, port=port, debug=False)
