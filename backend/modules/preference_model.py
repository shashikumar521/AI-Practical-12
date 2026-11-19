"""
Preference learning module powered by Scikit-learn KNeighborsClassifier and NumPy.

Stores all preference observations strictly in temporary process memory (no database).
Uses an 8-dimensional numerical feature representation across stylistic attributes:
  [Simple, Detailed, Technical, Examples, Step-by-Step, Professional, Beginner-Friendly, Short]

Limitations of feature-based KNN (documented for B.Tech AI & ML evaluation):
1. Context-Agnostic Style Features: Static style vectors do not encode the user's question
   domain (e.g., coding vs. philosophy vs. business), so a user who likes Technical answers
   for algorithms but Simple answers for finance shares one global preference space.
2. Cold-Start Problem: When zero or very few comparisons have been recorded, KNN lacks
   neighborhood density and relies on neutral priors + heuristic exploration.
3. Equal Feature Weighting: Euclidean distance treats all 8 stylistic dimensions equally
   unless explicit feature scaling or metric learning is introduced.
4. Small-Sample Variance: With very few feedback pairs (n < 6), single choices can shift
   nearest-neighbor probability estimates sharply.
5. Ephemeral Single-User Memory: All learned samples exist only in backend RAM; restarting
   the Flask server or clicking Reset clears learned preferences. Multi-user deployment
   would require isolated per-session/per-user state stores.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.neighbors import KNeighborsClassifier

FEATURE_NAMES: List[str] = [
    "Simple",
    "Detailed",
    "Technical",
    "Examples",
    "Step-by-step",
    "Professional",
    "Beginner-friendly",
    "Short",
]

# Distinct 8D feature vectors for each of the 8 supported answer styles.
# Continuous weights in [0.0, 1.0] eliminate duplicate feature vectors while preserving
# clear semantic interpretation across every stylistic dimension.
STYLE_VECTORS: Dict[str, List[float]] = {
    "Simple Explanation": [1.0, 0.0, 0.0, 0.25, 0.0, 0.0, 0.85, 0.4],
    "Detailed Explanation": [0.0, 1.0, 0.35, 0.7, 0.55, 0.35, 0.2, 0.0],
    "Technical Explanation": [0.0, 0.8, 1.0, 0.2, 0.2, 0.6, 0.0, 0.0],
    "Example-Based Explanation": [0.7, 0.3, 0.1, 1.0, 0.2, 0.1, 0.8, 0.2],
    "Short Answer": [0.8, 0.0, 0.0, 0.0, 0.0, 0.35, 0.55, 1.0],
    "Step-by-Step Explanation": [0.3, 0.8, 0.2, 0.6, 1.0, 0.2, 0.7, 0.0],
    "Professional Explanation": [0.1, 0.7, 0.55, 0.15, 0.2, 1.0, 0.0, 0.25],
    "Beginner-Friendly Explanation": [0.9, 0.3, 0.0, 0.8, 0.6, 0.0, 1.0, 0.1],
}

ALL_STYLES: List[str] = list(STYLE_VECTORS.keys())

STYLE_DESCRIPTIONS: Dict[str, str] = {
    "Simple Explanation": "Plain everyday language, intuitive framing, zero unnecessary jargon.",
    "Detailed Explanation": "Comprehensive, thorough breakdown covering nuances, mechanisms, and edge cases.",
    "Technical Explanation": "Rigorous engineering terminology, formal definitions, formulas, and architecture specifics.",
    "Example-Based Explanation": "Anchored around concrete real-world analogies, scenarios, and worked illustrations.",
    "Short Answer": "Crisp, high-signal summary directly answering the core question in minimal words.",
    "Step-by-Step Explanation": "Sequential numbered progression from first principles to final outcome.",
    "Professional Explanation": "Executive, polished business-ready communication with structured takeaways.",
    "Beginner-Friendly Explanation": "Welcoming, scaffolded teaching tone assuming zero prior background knowledge.",
}

KNOWN_LIMITATIONS: List[str] = [
    "Context-agnostic features: Static 8D style vectors do not condition on question topic or domain.",
    "Cold-start sensitivity: Predictions require initial user comparisons before KNN neighborhoods stabilize.",
    "Uniform Euclidean metric: All 8 stylistic dimensions carry equal geometric weight without metric learning.",
    "Volatile in-memory state: Preferences are stored in backend RAM only and reset when the Flask server restarts.",
    "Single-user prototype: Multi-user production use would require isolated per-user preference memory.",
]


class PreferenceModel:
    """In-memory KNN preference learning and pairwise ranking model."""

    def __init__(self, n_neighbors: int = 3) -> None:
        self.n_neighbors: int = max(1, min(7, int(n_neighbors)))
        self.reset()

    def reset(self) -> None:
        """Clear all in-memory preference observations and comparison logs."""
        self.X_samples: List[List[float]] = []
        self.y_labels: List[int] = []  # 1 = preferred (selected), 0 = rejected
        self.comparisons: List[Dict[str, Any]] = []
        self.selected_counts: Dict[str, int] = {style: 0 for style in ALL_STYLES}
        self.rejected_counts: Dict[str, int] = {style: 0 for style in ALL_STYLES}
        self.shown_counts: Dict[str, int] = {style: 0 for style in ALL_STYLES}
        self.pairwise_wins: Dict[Tuple[str, str], int] = {}
        self.last_fit_error: Optional[str] = None
        self._knn_classifier: Optional[KNeighborsClassifier] = None

    def set_n_neighbors(self, k: int) -> int:
        self.n_neighbors = max(1, min(7, int(k)))
        self._fit_model()
        return self.n_neighbors

    def record_comparison(
        self,
        request_id: str,
        question: str,
        style_a: str,
        style_b: str,
        selected: str,
        decision_mode: str = "initial",
    ) -> Dict[str, Any]:
        """Record a pairwise user preference and refit the in-memory KNN classifier."""
        selected_upper = selected.strip().upper()
        if selected_upper not in ("A", "B"):
            raise ValueError("Selection must be 'A' or 'B'.")

        if style_a not in STYLE_VECTORS or style_b not in STYLE_VECTORS:
            raise ValueError("Unknown answer style in comparison.")

        selected_style = style_a if selected_upper == "A" else style_b
        rejected_style = style_b if selected_upper == "A" else style_a

        # Append positive and negative feature vectors to temporary training buffer
        self.X_samples.append(STYLE_VECTORS[selected_style])
        self.y_labels.append(1)

        self.X_samples.append(STYLE_VECTORS[rejected_style])
        self.y_labels.append(0)

        self.selected_counts[selected_style] += 1
        self.rejected_counts[rejected_style] += 1
        self.shown_counts[style_a] += 1
        self.shown_counts[style_b] += 1

        pair_key = (selected_style, rejected_style)
        self.pairwise_wins[pair_key] = self.pairwise_wins.get(pair_key, 0) + 1

        record = {
            "request_id": request_id,
            "question": question[:200],
            "style_a": style_a,
            "style_b": style_b,
            "selected": selected_upper,
            "selected_style": selected_style,
            "rejected_style": rejected_style,
            "decision_mode": decision_mode,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.comparisons.append(record)

        self._fit_model()
        return record

    def _fit_model(self) -> None:
        """Fit Scikit-learn KNeighborsClassifier safely when sufficient feedback exists."""
        self.last_fit_error = None
        if len(self.X_samples) < 2 or len(set(self.y_labels)) < 2:
            self._knn_classifier = None
            return

        effective_k = min(self.n_neighbors, len(self.X_samples))
        try:
            X = np.asarray(self.X_samples, dtype=np.float64)
            y = np.asarray(self.y_labels, dtype=np.int64)
            clf = KNeighborsClassifier(
                n_neighbors=effective_k,
                weights="distance",
                metric="euclidean",
            )
            clf.fit(X, y)
            self._knn_classifier = clf
        except Exception as exc:  # Defensive safeguard against degenerate matrix errors
            self._knn_classifier = None
            self.last_fit_error = f"KNN training fallback triggered: {type(exc).__name__}"

    @property
    def is_trained(self) -> bool:
        """
        Do not claim the model is trained before meaningful preference data is collected.
        Requires at least 2 comparisons (4 labeled positive/negative samples).
        """
        return self._knn_classifier is not None and len(self.comparisons) >= 2

    @property
    def model_status(self) -> str:
        if len(self.comparisons) == 0:
            return "untrained"
        if len(self.comparisons) < 2 or self._knn_classifier is None:
            return "bootstrapping"
        return "trained"

    def _pairwise_ranking_score(self, style: str) -> float:
        """
        Compute a regularized pairwise win-rate score from recorded comparisons.
        Uses Laplace smoothing (alpha=1) so unshown styles stay at neutral 0.50.
        """
        wins = self.selected_counts[style]
        losses = self.rejected_counts[style]
        # Direct pairwise margin bonus when a style beats strong competitors
        margin_bonus = 0.0
        for (winner, loser), count in self.pairwise_wins.items():
            if winner == style:
                loser_strength = (self.selected_counts[loser] + 1.0) / (
                    self.selected_counts[loser] + self.rejected_counts[loser] + 2.0
                )
                margin_bonus += 0.05 * count * loser_strength
            elif loser == style:
                margin_bonus -= 0.03 * count

        base_rate = (wins + 1.0) / (wins + losses + 2.0)
        return float(np.clip(base_rate + margin_bonus, 0.05, 0.98))

    def predict_preference_scores(self) -> Dict[str, Dict[str, Any]]:
        """
        Return per-style preference probabilities combining Scikit-learn KNN
        neighborhood probabilities with pairwise preference-ranking feedback.
        """
        scores: Dict[str, Dict[str, Any]] = {}
        style_matrix = np.asarray([STYLE_VECTORS[s] for s in ALL_STYLES], dtype=np.float64)

        knn_probs: Optional[np.ndarray] = None
        if self._knn_classifier is not None:
            try:
                classes = list(self._knn_classifier.classes_)
                raw_probs = self._knn_classifier.predict_proba(style_matrix)
                if 1 in classes:
                    pos_idx = classes.index(1)
                    knn_probs = raw_probs[:, pos_idx]
            except Exception as exc:
                self.last_fit_error = f"KNN inference fallback triggered: {type(exc).__name__}"
                knn_probs = None

        for idx, style in enumerate(ALL_STYLES):
            pairwise_score = self._pairwise_ranking_score(style)
            if knn_probs is not None:
                knn_prob = float(knn_probs[idx])
                # Blend KNN geometric neighborhood probability (70%) + pairwise ranking signal (30%)
                blended = 0.70 * knn_prob + 0.30 * pairwise_score
            else:
                knn_prob = 0.50
                blended = 0.50 if len(self.comparisons) == 0 else pairwise_score

            scores[style] = {
                "style": style,
                "knn_probability": round(knn_prob, 4),
                "pairwise_score": round(pairwise_score, 4),
                "preference_score": round(float(np.clip(blended, 0.0, 1.0)), 4),
                "selected_count": self.selected_counts[style],
                "rejected_count": self.rejected_counts[style],
                "shown_count": self.shown_counts[style],
                "feature_vector": STYLE_VECTORS[style],
                "description": STYLE_DESCRIPTIONS[style],
            }

        return scores

    def get_stats(self, exploration_rate: float) -> Dict[str, Any]:
        """Serialize real preference-learning metrics for GET /stats."""
        scores_map = self.predict_preference_scores()
        ordered_scores = sorted(
            scores_map.values(),
            key=lambda item: (item["preference_score"], item["selected_count"]),
            reverse=True,
        )

        positive_samples = sum(1 for y in self.y_labels if y == 1)
        negative_samples = sum(1 for y in self.y_labels if y == 0)

        return {
            "comparisons": len(self.comparisons),
            "positive_samples": positive_samples,
            "negative_samples": negative_samples,
            "total_samples": len(self.y_labels),
            "learned_samples": len(self.y_labels),
            "model_trained": self.is_trained,
            "model_status": self.model_status,
            "n_neighbors": self.n_neighbors,
            "effective_k": min(self.n_neighbors, len(self.X_samples)) if self.X_samples else 0,
            "exploration_rate": round(exploration_rate, 4),
            "feature_names": FEATURE_NAMES,
            "selected_styles": {k: v for k, v in self.selected_counts.items() if v > 0},
            "rejected_styles": {k: v for k, v in self.rejected_counts.items() if v > 0},
            "shown_styles": {k: v for k, v in self.shown_counts.items() if v > 0},
            "knn_scores": ordered_scores,
            "recent_comparisons": list(reversed(self.comparisons[-15:])),
            "last_fit_error": self.last_fit_error,
            "limitations": KNOWN_LIMITATIONS,
            "storage_notice": (
                "All preferences are stored strictly in temporary backend memory. "
                "Restarting Flask or calling Reset clears all learned data."
            ),
        }
