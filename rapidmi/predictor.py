"""Prediction adapter that keeps the trained model artifact out of Git."""

from __future__ import annotations

import os
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

from .demo_cases import DEMO_CASES, FEATURES

SCREENING_THRESHOLD = 0.286


class PredictorUnavailable(RuntimeError):
    """Raised when a non-demo prediction is requested without an approved model."""


def _normalise(features: dict) -> dict:
    missing = [name for name in FEATURES if features.get(name) in (None, "")]
    if missing:
        raise ValueError(f"Missing required parameters: {', '.join(missing)}")
    try:
        return {name: float(features[name]) for name in FEATURES}
    except (TypeError, ValueError) as error:
        raise ValueError("All parameters must be numeric.") from error


def _matches_demo(case_id: str | None, values: dict) -> bool:
    case = DEMO_CASES.get(case_id or "")
    if case is None:
        return False
    expected = case["values"]
    return all(np.isclose(values[name], float(expected[name])) for name in FEATURES)


def _private_model_path() -> Path | None:
    configured = os.getenv("RAPIDMI_MODEL_PATH")
    if not configured:
        return None
    path = Path(configured).expanduser().resolve()
    return path if path.is_file() else None


def predict(features: dict, demo_case_id: str | None = None) -> dict:
    """Return a recorded demo output or use an explicitly supplied private artifact."""
    values = _normalise(features)
    if _matches_demo(demo_case_id, values):
        score = float(DEMO_CASES[demo_case_id]["score"])
        source = "Recorded output from the locked research model for this synthetic demo case."
    else:
        model_path = _private_model_path()
        if model_path is None:
            raise PredictorUnavailable(
                "The public repository does not include trained model artifacts. "
                "Only the two synthetic demo cases can return a recorded demo output."
            )
        with model_path.open("rb") as handle:
            model = pickle.load(handle)
        row = pd.DataFrame([[values[name] for name in FEATURES]], columns=FEATURES)
        score = float(model.predict_proba(row)[0, 1])
        source = "Output from a locally supplied private model artifact."

    return {
        "score": score,
        "threshold": SCREENING_THRESHOLD,
        "screen_positive": score >= SCREENING_THRESHOLD,
        "source": source,
        "notice": "Uncalibrated research-model output; not an individual MI probability or diagnosis.",
    }
