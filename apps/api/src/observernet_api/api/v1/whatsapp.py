from fastapi import APIRouter

router = APIRouter()


@router.post("/send")
async def send_whatsapp_message():
    # TODO: integrate with provider abstraction and message templates
    return {"status": "queued"}
