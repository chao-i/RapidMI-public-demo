# RapidMI Public Demonstration and OCR Reference

This repository contains a privacy-preserving reference implementation for the
RapidMI research interface. It provides:

- a Flask web interface for reviewing 13 ECG-report parameters;
- an optional, template-dependent OCR extraction example using Tesseract;
- two synthetic ECG-report demonstration cases with no patient information;
- a Docker deployment template that binds to localhost by default.

## What this repository does not contain

The public repository intentionally excludes the following private or
restricted materials:

- trained RapidMI model artifacts, preprocessing objects, and model metadata;
- raw ECG waveforms, ECG report images, OCR review files, and clinical data;
- training, external-validation, and manuscript-generation code;
- server addresses, credentials, domains, and deployment secrets.

The included demo cases return recorded outputs from the locked research model
only for interface demonstration. They are not clinical predictions and do not
make the trained model available.

## Important research-use notice

RapidMI is a research prototype. It is not a medical device and must not be
used to diagnose, rule in, rule out, or treat myocardial infarction. The output
is an uncalibrated screening-model output, not an individual probability of MI.
Any deployment involving real reports requires institutional governance,
privacy review, validation in the intended setting, access control, HTTPS, and
human clinical review.

## Quick start

### Docker

```bash
docker compose -f deployment/docker-compose.yml up --build
```

The template listens only on `127.0.0.1:8000`. For a public deployment, place
the service behind an authenticated HTTPS reverse proxy. Do not expose it
directly while testing OCR on real reports.

### Local Python

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:8000`.

## OCR setup

The OCR endpoint uses Tesseract. The Docker image installs English and
Simplified-Chinese language packs. The parser is pattern-based and intended as
a transparent starting point for research, not as a validated clinical
extraction service. Review every extracted field against its source report.

Uploaded images are processed in memory by this reference application and are
not intentionally saved. Do not upload patient-identifiable reports to a
public or unencrypted deployment.

## Optional private model artifact

To test the interface with an authorized private model artifact, place the
artifact outside version control and set:

```bash
export RAPIDMI_MODEL_PATH=/secure/path/rapidmi_pipeline.pkl
```

The model file must implement scikit-learn's `predict_proba` method and expect
the feature order declared in `rapidmi/predictor.py`. Do not commit the model
artifact or any derived metadata to this repository.

## Public-release audit

Before pushing to GitHub, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\audit_public_release.ps1
```

The audit checks for common private artifacts, local paths, and server details.
It is a guardrail, not a replacement for a manual review.

## License

The source code is released under the MIT License. The RapidMI name, research
results, and any private model artifact are not granted for clinical or
commercial use by this code license.
