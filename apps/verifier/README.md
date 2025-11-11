# ObserverNet Verifier Service

Lightweight FastAPI microservice that coordinates Didit verification sessions and proxies webhook events to the core API.

## Local Development

```bash
cd apps/verifier
poetry install
poetry run uvicorn verifier.app:create_app --factory --reload --port 8080
```

Integrate with Didit session APIs and Fabric subject registration workflows as part of the end-to-end verification pipeline.
