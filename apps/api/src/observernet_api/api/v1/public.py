from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class JoinResponse(BaseModel):
    status: str
    election_id: str


class VoteRequest(BaseModel):
    selections: list[dict]
    commitment_hash: str
    metadata: dict


class VoteResponse(BaseModel):
    fabric_tx_id: str
    receipt_url: str


@router.post("/{election_id}/join", response_model=JoinResponse)
async def join_election(election_id: str):
    # TODO: enforce policies and return Didit session or code challenge
    return JoinResponse(status="verification_required", election_id=election_id)


@router.post("/{election_id}/vote", response_model=VoteResponse)
async def cast_vote(election_id: str, payload: VoteRequest):
    if not payload.commitment_hash:
        raise HTTPException(status_code=400, detail="Commitment hash required")

    # TODO: enforce policies, write commitment to Fabric, return receipt URL
    return VoteResponse(
        fabric_tx_id="fabric-demo-001",
        receipt_url=f"/e/{election_id}/receipt/{payload.commitment_hash}"
    )
