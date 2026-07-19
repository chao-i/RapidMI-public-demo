# RapidMI Research Interface Reference

This repository contains a privacy-preserving reference implementation for the
RapidMI research interface. It mirrors the visible browser workflow and its two
fixed test reports while excluding the locked model artifact, clinical data,
and production-only configuration. It provides:

- a Flask web interface for reviewing 13 ECG-report parameters;
- an optional, template-dependent OCR extraction example using Tesseract;
- two fixed, non-patient ECG-report test cases with preloaded values;
- a Docker deployment template that binds to localhost by default.

## What this repository does not contain

The public repository intentionally excludes the following private or
restricted materials:

- trained RapidMI model artifacts, preprocessing objects, and model metadata;
- raw ECG waveforms, ECG report images, OCR review files, and clinical data;
- training, external-validation, and manuscript-generation code;
- server addresses, credentials, domains, and deployment secrets.

## Fixed test reports

The two test reports are intended for reviewers and other users to explore the
same browser workflow shown by the hosted research prototype:

- **Normal-ECG test report:** recorded locked-model score 0.0070, below the
  fixed screening threshold.
- **MI-related screen-positive test report:** recorded locked-model score
  0.8539, above the fixed screening threshold of 0.286.

These reports contain no patient information. Their displayed parameter values
and recorded outputs are supplied for interface testing only; they do not make
the trained model available or provide clinical predictions for a new patient.

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
public or unencrypted deployment. The public OCR parser is included only as a
reference implementation; the two fixed test reports do not require OCR.

## Optional private model artifact

The public code returns recorded outputs only for the two fixed test reports.
To evaluate another input with an authorized private model artifact, place the
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
