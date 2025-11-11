from fastapi import APIRouter

from . import didit

webhook_router = APIRouter()
webhook_router.include_router(didit.router, prefix="/didit", tags=["webhooks"])
