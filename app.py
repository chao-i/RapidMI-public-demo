"""Privacy-conscious public reference interface for RapidMI research demos."""

from __future__ import annotations

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge

from rapidmi.demo_cases import FEATURES, public_cases
from rapidmi.predictor import FEATURE_LABELS, NORMAL_RANGES
from rapidmi.ocr import extract_parameters_from_image
from rapidmi.predictor import PredictorUnavailable, predict

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024


@app.after_request
def security_headers(response):
    """Minimise browser persistence for an interface that may handle report text."""
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.errorhandler(RequestEntityTooLarge)
def oversized_upload(_error):
    return jsonify({"error": "Image files must be 6 MB or smaller."}), 413


@app.get("/")
def index():
    return render_template("index.html", features=FEATURES)


@app.get("/healthz")
def healthz():
    return jsonify({"service": "rapidmi-public-demo", "status": "ok"})


@app.get("/api/demo-cases")
def demo_cases():
    return jsonify({"cases": public_cases()})


@app.post("/api/ocr")
def ocr():
    image = request.files.get("image")
    if image is None or not image.filename:
        return jsonify({"error": "Select a PNG, JPEG, TIFF, or BMP image."}), 400
    if not image.mimetype.startswith("image/"):
        return jsonify({"error": "Only image uploads are accepted."}), 400
    try:
        result = extract_parameters_from_image(image.read())
    except (RuntimeError, ValueError) as error:
        return jsonify({"error": str(error)}), 400
    extracted = result["values"]
    details = []
    for feature, value in extracted.items():
        lower, upper = NORMAL_RANGES[feature]
        if value < lower:
            status = "abnormal_low"
        elif value > upper:
            status = "abnormal_high"
        else:
            status = "normal"
        details.append({
            "feature": feature,
            "en_name": FEATURE_LABELS[feature],
            "cn_name": FEATURE_LABELS[feature],
            "value": value,
            "unit": "",
            "unit_en": "",
            "status": status,
            "abnormal_msg": "",
            "abnormal_msg_en": "",
        })
    return jsonify({
        "ocr_available": True,
        "extracted": extracted,
        "details": details,
        "n_abnormal": sum(item["status"] != "normal" for item in details),
        "n_extracted": len(extracted),
        "n_total": len(FEATURES),
        "missing": [feature for feature in FEATURES if feature not in extracted],
    })


@app.post("/api/predict")
def prediction():
    payload = request.get_json(silent=True) or {}
    try:
        result = predict(payload.get("features", {}), payload.get("demo_case_id"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except PredictorUnavailable as error:
        return jsonify({"error": str(error)}), 503
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)
