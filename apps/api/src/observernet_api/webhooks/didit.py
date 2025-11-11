from fastapi import APIRouter, Header, HTTPException, Request

from ..services.didit import DiditClient

router = APIRouter()


@router.post("")
async def didit_webhook(request: Request, x_didit_signature: str = Header(default="")):
    client = DiditClient()
    payload = await request.body()
    if not await client.verify_webhook_signature(x_didit_signature, payload):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # TODO: update verification status in database and trigger Fabric registration
    return {"status": "accepted"}
