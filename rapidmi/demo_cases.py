"""Fixed, non-patient test cases used only by the public interface demo."""

FEATURES = [
    "age",
    "sex",
    "hr",
    "pr_interval",
    "qrs_duration",
    "qt_interval",
    "qtc",
    "p_axis",
    "qrs_axis",
    "t_axis",
    "rv5",
    "sv1",
    "rv5_sv1_amp",
]

DEMO_CASES = {
    "normal": {
        "id": "normal",
        "title": "Normal-ECG test report",
        "image_url": "/static/demo/rapidmi_test_normal.svg",
        "note": "Test report with preloaded parameter values.",
        "score": 0.0070,
        "values": {
            "age": 43,
            "sex": 0,
            "hr": 72,
            "pr_interval": 150,
            "qrs_duration": 88,
            "qt_interval": 370,
            "qtc": 405,
            "p_axis": 48,
            "qrs_axis": 35,
            "t_axis": 42,
            "rv5": 1.40,
            "sv1": 0.70,
            "rv5_sv1_amp": 2.10,
        },
    },
    "mi_related": {
        "id": "mi_related",
        "title": "MI-related screen-positive test report",
        "image_url": "/static/demo/rapidmi_test_mi_related.svg",
        "note": "Test report with preloaded parameter values.",
        "score": 0.8539,
        "values": {
            "age": 55,
            "sex": 1,
            "hr": 80,
            "pr_interval": 155,
            "qrs_duration": 98,
            "qt_interval": 395,
            "qtc": 435,
            "p_axis": 48,
            "qrs_axis": 50,
            "t_axis": 92,
            "rv5": 1.50,
            "sv1": 0.70,
            "rv5_sv1_amp": 2.20,
        },
    },
}


def public_cases():
    """Return only presentation fields; scores remain server-side demo metadata."""
    return [
        {
            "id": case["id"],
            "title": case["title"],
            "image_url": case["image_url"],
            "note": case["note"],
            "values": case["values"],
        }
        for case in DEMO_CASES.values()
    ]
