FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-chi-sim \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin rapidmi

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=rapidmi:rapidmi app.py ./
COPY --chown=rapidmi:rapidmi rapidmi ./rapidmi
COPY --chown=rapidmi:rapidmi templates ./templates
COPY --chown=rapidmi:rapidmi static ./static

USER rapidmi
EXPOSE 8000

CMD ["gunicorn", "--workers", "1", "--threads", "2", "--timeout", "120", "--bind", "0.0.0.0:8000", "app:app"]
