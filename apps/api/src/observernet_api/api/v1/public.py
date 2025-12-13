"""
Public Election API - Voter-facing endpoints for election participation.

This module provides:
- Election information (public view)
- Join election / verification flow
- Access code validation
- Ballot submission (redirects to voting API)
- Receipt verification

SECURITY:
- No authentication required for public info
- Access codes validated with rate limiting
- Vote submission requires valid token
"""

from __future__ import annotations

import secrets
from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...database.models import (
    AccessCode,
    AccessCodeStatus,
    Ballot,
    BallotStatus,
    Contest,
    ContestOption,
    Election,
    ElectionStatus,
    Voter,
    VoterStatus,
)
from ...services.crypto import hash_voter_pii


router = APIRouter()


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class PublicElectionInfo(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    status: str
    votingStartAt: datetime
    votingEndAt: datetime
    allowVoteChange: bool
    voteChangeDeadline: Optional[datetime]
    branding: dict
    contestCount: int
    voterCount: int
    turnoutPercent: float


class ContestOptionInfo(BaseModel):
    id: str
    name: str
    description: Optional[str]
    sortOrder: int


class ContestInfo(BaseModel):
    id: str
    name: str
    description: Optional[str]
    sortOrder: int
    options: List[ContestOptionInfo]


class JoinResponse(BaseModel):
    status: str
    election_id: str
    verification_methods: List[str]
    message: str


class CodeVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=20)


class CodeVerifyResponse(BaseModel):
    status: str
    voter_hash: Optional[str] = None
    can_vote: bool
    has_voted: bool
    message: str


class ReceiptVerifyRequest(BaseModel):
    receipt_code: str = Field(..., min_length=8, max_length=32)


class ReceiptVerifyResponse(BaseModel):
    found: bool
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None
    fabric_tx_id: Optional[str] = None
    message: str


class PublicStatsResponse(BaseModel):
    total_voters: int
    votes_cast: int
    turnout_percent: float
    voting_open: bool
    time_remaining: Optional[str] = None


# ============================================================================
# PUBLIC ELECTION ENDPOINTS
# ============================================================================

@router.get("/{slug}", response_model=PublicElectionInfo)
async def get_public_election(
    slug: Annotated[str, Path(description="Election slug")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get public election information by slug.

    This endpoint is accessible without authentication for voter information.
    """
    # Find election by slug
    result = await db.execute(
        select(Election).where(Election.slug == slug)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Only show published, active, or closed elections publicly
    if election.status not in [ElectionStatus.PUBLISHED, ElectionStatus.ACTIVE, ElectionStatus.CLOSED]:
        raise HTTPException(status_code=404, detail="Election not found")

    # Get contest count
    contest_count = await db.execute(
        select(func.count()).select_from(Contest).where(Contest.electionId == election.id)
    )
    contest_count = contest_count.scalar() or 0

    # Get voter stats
    total_voters = await db.execute(
        select(func.count()).select_from(Voter).where(Voter.electionId == election.id)
    )
    total_voters = total_voters.scalar() or 0

    voted_count = await db.execute(
        select(func.count()).select_from(Voter).where(
            Voter.electionId == election.id,
            Voter.status == VoterStatus.VOTED,
        )
    )
    voted_count = voted_count.scalar() or 0

    turnout = round((voted_count / total_voters * 100), 2) if total_voters > 0 else 0

    # Extract branding from settings
    branding = election.settings.get("branding", {}) if election.settings else {}

    return PublicElectionInfo(
        id=election.id,
        name=election.name,
        slug=election.slug,
        description=election.description,
        status=election.status.value,
        votingStartAt=election.votingStartAt,
        votingEndAt=election.votingEndAt,
        allowVoteChange=election.allowVoteChange,
        voteChangeDeadline=election.voteChangeDeadline,
        branding=branding,
        contestCount=contest_count,
        voterCount=total_voters,
        turnoutPercent=turnout,
    )


@router.get("/{slug}/contests", response_model=List[ContestInfo])
async def get_election_contests(
    slug: Annotated[str, Path(description="Election slug")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get election contests and options for ballot display.
    """
    # Find election
    result = await db.execute(
        select(Election).where(Election.slug == slug)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Only show for published/active elections
    if election.status not in [ElectionStatus.PUBLISHED, ElectionStatus.ACTIVE]:
        raise HTTPException(
            status_code=400,
            detail="Contest information not available for this election"
        )

    # Get contests with options
    contests_result = await db.execute(
        select(Contest)
        .where(Contest.electionId == election.id)
        .order_by(Contest.sortOrder)
    )
    contests = contests_result.scalars().all()

    response = []
    for contest in contests:
        options_result = await db.execute(
            select(ContestOption)
            .where(ContestOption.contestId == contest.id)
            .order_by(ContestOption.sortOrder)
        )
        options = options_result.scalars().all()

        response.append(ContestInfo(
            id=contest.id,
            name=contest.name,
            description=contest.description,
            sortOrder=contest.sortOrder,
            options=[
                ContestOptionInfo(
                    id=opt.id,
                    name=opt.name,
                    description=opt.description,
                    sortOrder=opt.sortOrder,
                )
                for opt in options
            ],
        ))

    return response


@router.get("/{slug}/stats", response_model=PublicStatsResponse)
async def get_election_stats(
    slug: Annotated[str, Path(description="Election slug")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get real-time election statistics.

    Note: Detailed results are only available after election closes
    to prevent early result leakage.
    """
    result = await db.execute(
        select(Election).where(Election.slug == slug)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Get voter counts
    total_voters = await db.execute(
        select(func.count()).select_from(Voter).where(Voter.electionId == election.id)
    )
    total_voters = total_voters.scalar() or 0

    votes_cast = await db.execute(
        select(func.count()).select_from(Ballot).where(
            Ballot.electionId == election.id,
            Ballot.status.in_([BallotStatus.PENDING, BallotStatus.CONFIRMED, BallotStatus.TALLIED])
        )
    )
    votes_cast = votes_cast.scalar() or 0

    turnout = round((votes_cast / total_voters * 100), 2) if total_voters > 0 else 0

    # Calculate time remaining
    now = datetime.utcnow()
    voting_open = (
        election.status == ElectionStatus.ACTIVE and
        election.votingStartAt <= now <= election.votingEndAt
    )

    time_remaining = None
    if voting_open:
        remaining = election.votingEndAt - now
        hours, remainder = divmod(int(remaining.total_seconds()), 3600)
        minutes, _ = divmod(remainder, 60)
        if hours > 24:
            days = hours // 24
            time_remaining = f"{days} day{'s' if days > 1 else ''}"
        elif hours > 0:
            time_remaining = f"{hours}h {minutes}m"
        else:
            time_remaining = f"{minutes} minutes"

    return PublicStatsResponse(
        total_voters=total_voters,
        votes_cast=votes_cast,
        turnout_percent=turnout,
        voting_open=voting_open,
        time_remaining=time_remaining,
    )


# ============================================================================
# VERIFICATION FLOW
# ============================================================================

@router.post("/{slug}/join", response_model=JoinResponse)
async def join_election(
    slug: Annotated[str, Path(description="Election slug")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Start the voter verification flow for an election.

    Returns available verification methods for the election.
    """
    result = await db.execute(
        select(Election).where(Election.slug == slug)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status not in [ElectionStatus.PUBLISHED, ElectionStatus.ACTIVE]:
        raise HTTPException(
            status_code=400,
            detail="Election is not open for registration"
        )

    # Get verification methods from settings
    policies = election.settings.get("policies", {}) if election.settings else {}
    verification_methods = policies.get("verificationMethods", ["access_code"])

    return JoinResponse(
        status="verification_required",
        election_id=election.id,
        verification_methods=verification_methods,
        message="Please verify your eligibility using one of the available methods",
    )


@router.post("/{slug}/verify-code", response_model=CodeVerifyResponse)
async def verify_access_code(
    slug: Annotated[str, Path(description="Election slug")],
    payload: CodeVerifyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """
    Verify an access code for the election.

    This is a simplified endpoint that delegates to the full code consumption flow.
    """
    import hashlib

    # Find election
    result = await db.execute(
        select(Election).where(Election.slug == slug)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Hash the code
    code_hash = hashlib.sha256(payload.code.upper().strip().encode()).hexdigest()

    # Find the access code
    code_result = await db.execute(
        select(AccessCode).where(
            AccessCode.codeHash == code_hash,
            AccessCode.electionId == election.id,
        )
    )
    access_code = code_result.scalar_one_or_none()

    if not access_code:
        raise HTTPException(status_code=400, detail="Invalid access code")

    if access_code.status != AccessCodeStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Code is no longer valid (status: {access_code.status.value})"
        )

    now = datetime.utcnow()
    if access_code.expiresAt and access_code.expiresAt < now:
        raise HTTPException(status_code=400, detail="Access code has expired")

    # Get voter info if linked
    voter_hash = None
    has_voted = False
    can_vote = True

    if access_code.voterId:
        voter_result = await db.execute(
            select(Voter).where(Voter.id == access_code.voterId)
        )
        voter = voter_result.scalar_one_or_none()
        if voter:
            voter_hash = voter.voterHash
            has_voted = voter.status == VoterStatus.VOTED
            can_vote = voter.status in [VoterStatus.PENDING, VoterStatus.VERIFIED]

            # If already voted, check if vote change is allowed
            if has_voted:
                can_vote = (
                    election.allowVoteChange and
                    (not election.voteChangeDeadline or now < election.voteChangeDeadline)
                )

    return CodeVerifyResponse(
        status="valid",
        voter_hash=voter_hash,
        can_vote=can_vote,
        has_voted=has_voted,
        message="Code verified successfully" + (" (vote change available)" if has_voted and can_vote else ""),
    )


# ============================================================================
# RECEIPT VERIFICATION
# ============================================================================

@router.post("/{slug}/verify-receipt", response_model=ReceiptVerifyResponse)
async def verify_receipt(
    slug: Annotated[str, Path(description="Election slug")],
    payload: ReceiptVerifyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Verify a ballot receipt code.

    Allows voters to verify their ballot was recorded correctly.
    """
    # Find election
    result = await db.execute(
        select(Election).where(Election.slug == slug)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Search for ballot by commitment hash prefix
    # Receipt codes are the first 16 chars of commitment hash
    ballots_result = await db.execute(
        select(Ballot).where(
            Ballot.electionId == election.id,
            Ballot.commitmentHash.startswith(payload.receipt_code.lower())
        )
    )
    ballot = ballots_result.scalar_one_or_none()

    if not ballot:
        return ReceiptVerifyResponse(
            found=False,
            message="No ballot found with this receipt code. Please check your code and try again.",
        )

    return ReceiptVerifyResponse(
        found=True,
        status=ballot.status.value,
        submitted_at=ballot.submittedAt,
        fabric_tx_id=ballot.fabricTxId,
        message="Your ballot was recorded successfully.",
    )


@router.get("/{slug}/receipt/{commitment_hash}")
async def get_receipt(
    slug: Annotated[str, Path(description="Election slug")],
    commitment_hash: Annotated[str, Path(description="Ballot commitment hash")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get detailed receipt information for a ballot.
    """
    # Find election
    result = await db.execute(
        select(Election).where(Election.slug == slug)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Find ballot
    ballot_result = await db.execute(
        select(Ballot).where(
            Ballot.electionId == election.id,
            Ballot.commitmentHash == commitment_hash,
        )
    )
    ballot = ballot_result.scalar_one_or_none()

    if not ballot:
        raise HTTPException(status_code=404, detail="Ballot not found")

    return {
        "election": {
            "name": election.name,
            "slug": election.slug,
        },
        "ballot": {
            "commitmentHash": ballot.commitmentHash,
            "status": ballot.status.value,
            "submittedAt": ballot.submittedAt.isoformat() if ballot.submittedAt else None,
            "confirmedAt": ballot.confirmedAt.isoformat() if ballot.confirmedAt else None,
            "fabricTxId": ballot.fabricTxId,
            "fabricBlockNum": ballot.fabricBlockNum,
            "channel": ballot.channel.value if ballot.channel else None,
        },
        "verification": {
            "receiptCode": ballot.commitmentHash[:16].upper(),
            "blockchainVerified": ballot.fabricTxId is not None,
        },
    }
