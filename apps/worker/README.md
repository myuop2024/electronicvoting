# ObserverNet Worker

Celery-based worker handling OCR, AI assistance, notification fan-out, and Fabric event ingestion.

## Local Development

```bash
cd apps/worker
poetry install
poetry run celery -A observernet_worker.celery_app worker --loglevel=info
```

Tasks are stubbed for scaffolding and should be extended with OCR pipelines (Tesseract + Gemini), email/WhatsApp providers, and Fabric commit helpers.
