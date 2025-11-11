# ObserverNet API Service

FastAPI application providing election management endpoints, verification orchestration, WhatsApp flows, and public vote receipts.

## Local Development

```bash
cd apps/api
poetry install
poetry run uvicorn observernet_api.app:create_app --factory --reload
```

Environment variables are loaded from `.env` (see repository `.env.example`). The service exposes OpenAPI docs at `/api/docs` and health at `/health`.

## Key Modules

- `api/v1/verification.py` – Didit session bootstrap
- `api/v1/elections.py` – Admin APIs for elections, allowlists, and access codes
- `api/v1/public.py` – Public join/vote endpoints writing to Fabric
- `webhooks/didit.py` – Signed Didit webhook handler
- `services/didit.py` – Thin client for Didit API integration

Fabric commits, audit logging, and persistence are stubbed for scaffolding and should be implemented with proper repositories and chaincode invocations.
