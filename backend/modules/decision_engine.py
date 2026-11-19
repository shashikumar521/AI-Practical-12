"""
Decision-making engine for selecting two distinct answer styles per user question.

Balances:
- KNN preference scores (exploitation of learned cognitive preferences)
- Exploration of under-sampled styles (epsilon-greedy + UCB coverage)
- Style diversity via Euclidean distance in 8D feature space so the two generated
  answers never collapse into nearly identical styles.
"""

from __future__ import annotations

import random
from typing import Dict, List, Optional, Tuple

import numpy as np

from .preference_model import ALL_STYLES, STYLE_VECTORS, PreferenceModel

# Minimum Euclidean distance in 8D style space to avoid nearly identical pairs
MIN_STYLE_DISTANCE = 1.05

# Default diverse pair for the cold-start first comparison
DEFAULT_INITIAL_PAIR: Tuple[str, str] = ("Simple Explanation", "Technical Explanation")


def style_distance(style_a: str, style_b: str) -> float:
    vec_a = np.asarray(STYLE_VECTORS[style_a], dtype=np.float64)
    vec_b = np.asarray(STYLE_VECTORS[style_b], dtype=np.float64)
    return float(np.linalg.norm(vec_a - vec_b))


class DecisionEngine:
    """Epsilon-greedy + diversity-constrained style selection engine."""

    def __init__(self, preference_model: PreferenceModel, exploration_rate: float = 0.30) -> None:
        self.preference_model = preference_model
        self.exploration_rate = max(0.0, min(1.0, float(exploration_rate)))
        self._last_pair: Optional[Tuple[str, str]] = None

    def reset(self) -> None:
        self._last_pair = None

    def set_exploration_rate(self, epsilon: float) -> float:
        self.exploration_rate = max(0.0, min(1.0, float(epsilon)))
        return self.exploration_rate

    def _pick_diverse_partner(
        self,
        anchor: str,
        candidates: List[str],
        scores: Dict[str, Dict[str, float]],
        prefer_unexplored: bool = False,
    ) -> str:
        """Select a second style sufficiently distant from anchor in 8D feature space."""
        pool = [s for s in candidates if s != anchor]
        diverse_pool = [s for s in pool if style_distance(anchor, s) >= MIN_STYLE_DISTANCE]
        effective_pool = diverse_pool if diverse_pool else pool

        if prefer_unexplored:
            # Prefer least-shown styles, breaking ties by feature distance from anchor
            effective_pool.sort(
                key=lambda s: (
                    self.preference_model.shown_counts[s],
                    -style_distance(anchor, s),
                )
            )
            return effective_pool[0]

        # Score candidates by preference + mild novelty bonus so we avoid repeating identical pairs
        def rank_key(s: str) -> float:
            pref = float(scores[s]["preference_score"])
            shown = self.preference_model.shown_counts[s]
            novelty_bonus = 0.12 / (1.0 + shown)
            repeat_penalty = 0.25 if self._last_pair and set(self._last_pair) == {anchor, s} else 0.0
            return pref + novelty_bonus - repeat_penalty

        effective_pool.sort(key=rank_key, reverse=True)
        return effective_pool[0]

    def select_styles(self, bias_mode: str = "balanced") -> Dict[str, object]:
        """
        Choose Style A and Style B for the next question.

        bias_mode:
          - 'balanced': uses configured exploration_rate (default epsilon-greedy)
          - 'explore': forces exploratory style pairing
          - 'exploit': prioritizes highest KNN preference scores
        """
        comparisons = len(self.preference_model.comparisons)
        scores = self.preference_model.predict_preference_scores()

        # Stage 1: Cold start (0 comparisons) — use clean contrasting defaults
        if comparisons == 0:
            style_a, style_b = DEFAULT_INITIAL_PAIR
            self._last_pair = (style_a, style_b)
            return {
                "style_a": style_a,
                "style_b": style_b,
                "decision_mode": "initial_default",
                "style_distance": round(style_distance(style_a, style_b), 4),
            }

        # Effective exploration probability based on bias_mode
        if bias_mode == "explore":
            effective_epsilon = 1.0
        elif bias_mode == "exploit":
            effective_epsilon = 0.0
        else:
            effective_epsilon = self.exploration_rate

        # Stage 2: Early bootstrapping (< 2 comparisons) or epsilon-triggered exploration
        is_exploring = (not self.preference_model.is_trained) or (random.random() < effective_epsilon)

        if is_exploring:
            # Pick least-shown style (with slight randomness among ties) as Style A
            min_shown = min(self.preference_model.shown_counts.values())
            least_shown = [
                s for s in ALL_STYLES if self.preference_model.shown_counts[s] == min_shown
            ]
            # If user already rejected a style heavily while others have feedback, still rotate fairly
            style_a = random.choice(least_shown)
            style_b = self._pick_diverse_partner(
                style_a, ALL_STYLES, scores, prefer_unexplored=True
            )
            mode = "bootstrap_explore" if not self.preference_model.is_trained else "exploration"
        else:
            # Stage 3: Exploitation + challenger comparison
            ranked_styles = sorted(
                ALL_STYLES,
                key=lambda s: (
                    float(scores[s]["preference_score"]),
                    self.preference_model.selected_counts[s] - self.preference_model.rejected_counts[s],
                ),
                reverse=True,
            )
            style_a = ranked_styles[0]

            # Pair top KNN-predicted style against either an under-explored challenger or 2nd best
            under_explored = [
                s for s in ranked_styles[1:] if self.preference_model.shown_counts[s] == 0
            ]
            if under_explored:
                style_b = self._pick_diverse_partner(
                    style_a, under_explored + ranked_styles[1:], scores, prefer_unexplored=True
                )
                mode = "exploit_hybrid"
            else:
                style_b = self._pick_diverse_partner(
                    style_a, ranked_styles[1:], scores, prefer_unexplored=False
                )
                mode = "exploitation"

        # Randomize slot order (A vs B) on 50% of exploited turns to prevent positional bias
        if comparisons > 0 and random.random() < 0.5:
            style_a, style_b = style_b, style_a

        self._last_pair = (style_a, style_b)
        return {
            "style_a": style_a,
            "style_b": style_b,
            "decision_mode": mode,
            "style_distance": round(style_distance(style_a, style_b), 4),
        }
