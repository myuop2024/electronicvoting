from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...services.didit import DiditClient
from ...security.auth import get_current_subject

router = APIRouter()


class KycStartResponse(BaseModel):
    session_id: str
    url: str
    status: str


@router.post("/start", response_model=KycStartResponse)
async def start_kyc(subject=Depends(get_current_subject), didit: DiditClient = Depends(DiditClient)):
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    session = await didit.create_session(subject_id=subject.subject_id)
    return KycStartResponse(session_id=session.session_id, url=session.url, status=session.status)
