"""Prediction adapter that keeps the trained model artifact out of Git."""

from __future__ import annotations

import os
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

from .demo_cases import DEMO_CASES, FEATURES

SCREENING_THRESHOLD = 0.286

NORMAL_RANGES = {
    "age": [18, 120],
    "sex": [0, 1],
    "hr": [60, 100],
    "pr_interval": [120, 200],
    "qrs_duration": [60, 110],
    "qt_interval": [350, 440],
    "qtc": [350, 460],
    "p_axis": [0, 75],
    "qrs_axis": [-30, 90],
    "t_axis": [0, 90],
    "rv5": [0.01, 2.5],
    "sv1": [0.01, 1.5],
    "rv5_sv1_amp": [0.02, 3.5],
}

FEATURE_LABELS = {
    "age": "Age", "sex": "Sex", "hr": "Heart Rate",
    "pr_interval": "PR Interval", "qrs_duration": "QRS Duration",
    "qt_interval": "QT Interval", "qtc": "QTc", "p_axis": "P Axis",
    "qrs_axis": "QRS Axis", "t_axis": "T Axis", "rv5": "RV5",
    "sv1": "SV1", "rv5_sv1_amp": "RV5+SV1",
}


def _reference_flags(values: dict) -> list[dict]:
    flags = []
    for feature, value in values.items():
        lower, upper = NORMAL_RANGES[feature]
        if value < lower or value > upper:
            flags.append({
                "feature": feature,
                "en_name": FEATURE_LABELS[feature],
                "cn_name": FEATURE_LABELS[feature],
                "value": value,
                "status": "abnormal_low" if value < lower else "abnormal_high",
                "normal_range": [lower, upper],
            })
    return flags


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

    flags = _reference_flags(values)
    return {
        "score": score,
        "score_pct": round(score * 100, 1),
        "probability": score,
        "probability_pct": round(score * 100, 1),
        "threshold": SCREENING_THRESHOLD,
        "screen_positive": score >= SCREENING_THRESHOLD,
        "risk_color": "#c62828" if score >= SCREENING_THRESHOLD else "#087f5b",
        "n_abnormal": len(flags),
        "abnormal_features": flags,
        "n_missing": 0,
        "missing_features": [],
        "missing_feature_names": [],
        "source": source,
        "notice": "Uncalibrated research-model output; not an individual MI probability or diagnosis.",
    }
