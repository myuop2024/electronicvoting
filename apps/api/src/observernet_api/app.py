from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .config.settings import settings
from .api.v1.router import api_router
from .security.headers import security_headers_middleware
from .webhooks.router import webhook_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="ObserverNet Election API",
        version="0.1.0",
        description="Multi-tenant election orchestration with Fabric-backed auditability",
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        allow_credentials=True,
        max_age=600,
    )

    app.add_middleware(SessionMiddleware, secret_key=settings.session_secret)
    app.middleware("http")(security_headers_middleware)

    app.include_router(api_router, prefix="/api")
    app.include_router(webhook_router, prefix="/webhooks")

    @app.get("/health", tags=["health"])
    async def health_check():
        return {
            "status": "ok",
            "fabric": settings.fabric_gateway_url,
        }

    return app
