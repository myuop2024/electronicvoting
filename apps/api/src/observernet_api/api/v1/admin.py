from fastapi import APIRouter, Depends, HTTPException

from ...security.auth import Subject, get_current_subject

router = APIRouter()


@router.get("/dashboard")
async def admin_dashboard(subject: Subject | None = Depends(get_current_subject)):
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return {
        "activeElections": 3,
        "pendingReviews": 5,
        "turnout": 64.2,
        "offlineBallotsPending": 12
    }
