from fastapi import APIRouter

from . import verification, elections, results, admin, whatsapp, public

api_router = APIRouter()

api_router.include_router(verification.router, prefix="/kyc", tags=["verification"])
api_router.include_router(elections.router, prefix="/elections", tags=["elections"])
api_router.include_router(results.router, prefix="/results", tags=["results"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["whatsapp"])
api_router.include_router(public.router, prefix="/e", tags=["public"])
