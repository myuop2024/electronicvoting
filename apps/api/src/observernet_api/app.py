from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from .config.settings import settings
from .api.v1.router import api_router
from .api.v1.websocket import router as websocket_router
from .security.headers import security_headers_middleware
from .security.auth import AuthMiddleware, get_current_subject, Subject
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

    # Add authentication middleware to attach subject to request state
    app.add_middleware(BaseHTTPMiddleware, dispatch=AuthMiddleware())

    app.middleware("http")(security_headers_middleware)

    # REST API routes
    app.include_router(api_router, prefix="/api")
    app.include_router(webhook_router, prefix="/webhooks")

    # WebSocket routes for real-time updates
    app.include_router(websocket_router, prefix="/ws", tags=["websocket"])

    @app.get("/health", tags=["health"])
    async def health_check():
        return {
            "status": "ok",
            "fabric": settings.fabric_gateway_url,
        }

    @app.on_event("startup")
    async def startup_event():
        """Initialize services on startup."""
        # Initialize database connection pool
        # Initialize Fabric client connection
        # Start background tasks for audit log anchoring
        pass

    @app.on_event("shutdown")
    async def shutdown_event():
        """Clean up on shutdown."""
        # Close database connections
        # Disconnect from Fabric gateway
        pass

    return app
