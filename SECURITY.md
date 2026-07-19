# Security policy

This repository is a research interface reference, not a clinical service.

## Reporting a vulnerability

Do not create a public issue containing credentials, server addresses, patient
data, or screenshots of real reports. Contact the repository maintainer
privately and provide only the minimum reproducible technical detail.

## Deployment minimums

- Use HTTPS and authentication before exposing the interface outside a trusted
  environment.
- Restrict SSH administration to trusted key-based accounts and known source
  IP addresses.
- Do not commit model artifacts, ECG images, OCR outputs, patient identifiers,
  passwords, or `.env` files.
- Treat OCR-extracted values as untrusted until manually reviewed.
