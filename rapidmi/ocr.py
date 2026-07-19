"""Template-dependent OCR extraction example for 13 ECG report parameters."""

from __future__ import annotations

import re
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from .demo_cases import FEATURES

MAX_IMAGE_DIMENSION = 1600


def _normalise_text(text: str) -> str:
    replacements = {
        "R V5": "RV5",
        "S V1": "SV1",
        "P R": "PR",
        "P-R": "PR",
        "QI": "QT",
        "O": "0",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text.replace("，", ".").replace("°", " deg ")


def _first_number(text: str, patterns: list[str]) -> float | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(",", "."))
            except ValueError:
                continue
    return None


def extract_parameters_from_text(text: str) -> dict:
    """Extract a conservative subset of report values from OCR text.

    This is intentionally transparent and template-dependent. A missing field
    is safer than an inferred field in a research review workflow.
    """
    text = _normalise_text(text)
    values: dict[str, float] = {}

    if re.search(r"(?:sex|gender|性别)\s*[:：]?\s*(?:female|女)", text, re.I):
        values["sex"] = 0.0
    elif re.search(r"(?:sex|gender|性别)\s*[:：]?\s*(?:male|男)", text, re.I):
        values["sex"] = 1.0

    patterns = {
        "age": [r"(?:age|年龄)\s*[:：]?\s*(\d{1,3})"],
        "hr": [r"(?:heart\s*rate|hr|心率)\D{0,12}(\d{2,3})"],
        "pr_interval": [r"(?:PR|P\s*-?\s*R|PR间期)\D{0,12}(\d{2,3})"],
        "qrs_duration": [r"(?:QRS\s*(?:duration|width|时限)?)\D{0,12}(\d{2,3})"],
        "qt_interval": [r"(?:QT\s*(?:interval|间期)?)\D{0,12}(\d{3})"],
        "qtc": [r"(?:QTc)\D{0,12}(\d{3})"],
        "p_axis": [r"(?:P\s*(?:axis|电轴))\D{0,12}(-?\d{1,3})"],
        "qrs_axis": [r"(?:QRS\s*(?:axis|电轴))\D{0,12}(-?\d{1,3})"],
        "t_axis": [r"(?:T\s*(?:axis|电轴))\D{0,12}(-?\d{1,3})"],
        "rv5": [r"(?:RV\s*5)\D{0,12}(\d+(?:\.\d+)?)"],
        "sv1": [r"(?:SV\s*1)\D{0,12}(\d+(?:\.\d+)?)"],
        "rv5_sv1_amp": [r"(?:RV5\s*\+\s*SV1)\D{0,12}(\d+(?:\.\d+)?)"],
    }
    for feature, feature_patterns in patterns.items():
        value = _first_number(text, feature_patterns)
        if value is not None:
            values[feature] = value

    voltage_pair = re.search(
        r"RV\s*5\s*/\s*SV\s*1\D{0,12}(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)",
        text,
        re.I,
    )
    if voltage_pair:
        values["rv5"] = float(voltage_pair.group(1))
        values["sv1"] = float(voltage_pair.group(2))

    pair = re.search(r"QT\s*/\s*QTc\D{0,12}(\d{3})\s*/\s*(\d{3})", text, re.I)
    if pair:
        values["qt_interval"] = float(pair.group(1))
        values["qtc"] = float(pair.group(2))

    axes = re.search(r"(?:P\s*/\s*QRS\s*/\s*T\s*(?:axis|电轴)?)\D{0,12}(-?\d{1,3})\s*/\s*(-?\d{1,3})\s*/\s*(-?\d{1,3})", text, re.I)
    if axes:
        values["p_axis"] = float(axes.group(1))
        values["qrs_axis"] = float(axes.group(2))
        values["t_axis"] = float(axes.group(3))

    if "rv5" in values and "sv1" in values and "rv5_sv1_amp" not in values:
        values["rv5_sv1_amp"] = round(values["rv5"] + values["sv1"], 3)

    return {feature: values[feature] for feature in FEATURES if feature in values}


def extract_parameters_from_image(image_bytes: bytes) -> dict:
    """Run Tesseract in memory and return parsed values without saving the image."""
    try:
        import pytesseract
    except ImportError as error:
        raise RuntimeError(
            "OCR dependencies are unavailable. Install requirements.txt or use the Docker deployment."
        ) from error
    try:
        image = Image.open(BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise ValueError("The uploaded file is not a valid image.") from error

    image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)
    try:
        text = pytesseract.image_to_string(image, lang="eng+chi_sim")
    except pytesseract.TesseractNotFoundError as error:
        raise RuntimeError("Tesseract is not installed or is not on the system path.") from error
    values = extract_parameters_from_text(text)
    return {
        "values": values,
        "n_extracted": len(values),
        "n_total": len(FEATURES),
    }
