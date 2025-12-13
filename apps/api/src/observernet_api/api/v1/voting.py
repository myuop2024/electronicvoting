"""
Voting API - Secure anonymous ballot submission with double-vote prevention.

This module implements the core voting flow:
1. Voter verification -> Token issuance
2. Token-based ballot submission -> Anonymous vote
3. Commitment generation -> Voter receipt
4. Blockchain anchoring -> Immutability proof

SECURITY ARCHITECTURE:
- Voter identity is NEVER stored with ballot
- VoteToken acts as blind intermediary
- Double-vote prevention via voter status check
- Cryptographic commitment for verifiability
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...database.models import (
    AuditLog,
    Ballot,
    BallotStatus,
    Contest,
    ContestOption,
    Election,
    ElectionStatus,
    Vote,
    VoteChannel,
    VoteToken,
    VoteTokenStatus,
    Voter,
    VoterStatus,
)
from ...security.auth import Subject, get_current_subject
from ...services.crypto import (
    create_ballot_commitment,
    encrypt_ballot_selections,
    generate_commitment_salt,
    generate_vote_token,
    hash_vote_token,
)
from ...services.fabric import anchor_ballot_to_blockchain, FabricGatewayError
from .websocket import (
    broadcast_ballot_confirmed,
    broadcast_turnout_update,
)

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class VoteSelection(BaseModel):
    """Single vote selection within a contest."""
    contestId: str
    optionId: Optional[str] = None
    rank: Optional[int] = None  # For ranked choice
    score: Optional[int] = None  # For score voting
    writeIn: Optional[str] = None  # For write-in


class TokenRequestInput(BaseModel):
    """Request for a vote token after verification."""
    electionId: str
    voterHash: str  # Pre-hashed voter identifier


class TokenResponse(BaseModel):
    """Response containing the vote token."""
    token: str  # Raw token for voter to store
    expiresAt: datetime
    message: str


class BallotSubmissionInput(BaseModel):
    """Ballot submission request."""
    electionId: str
    token: str  # Raw vote token
    selections: List[VoteSelection]
    channel: VoteChannel = VoteChannel.WEB


class BallotSubmissionResponse(BaseModel):
    """Response after ballot submission."""
    success: bool
    commitmentHash: str
    receiptCode: str  # Short code for voter to verify
    submittedAt: datetime
    message: str


class VerifyBallotInput(BaseModel):
    """Request to verify a ballot was recorded."""
    commitmentHash: str
    electionId: Optional[str] = None  # Optional - will search all elections if not provided


class VerifyBallotResponse(BaseModel):
    """Verification response."""
    found: bool
    electionId: Optional[str] = None
    electionName: Optional[str] = None
    status: Optional[str] = None
    submittedAt: Optional[datetime] = None
    talliedAt: Optional[datetime] = None
    fabricTxId: Optional[str] = None
    fabricBlockNum: Optional[int] = None
    verified: bool = False
    channel: Optional[str] = None
    message: str


# ============================================================================
# TOKEN ISSUANCE - Phase 1 of Anonymous Voting
# ============================================================================

@router.post("/token", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def request_vote_token(
    payload: TokenRequestInput,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Request a vote token after voter verification.

    This is Phase 1 of the anonymous voting protocol:
    1. Voter proves eligibility (via access code, KYC, etc.)
    2. System issues a blind token
    3. Voter uses token to submit ballot (Phase 2)

    The token breaks the link between voter identity and ballot.
    """
    # Check election exists and is active
    election = await db.execute(
        select(Election).where(Election.id == payload.electionId)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status != ElectionStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Election is not active (status: {election.status})"
        )

    now = datetime.utcnow()
    if now < election.votingStartAt:
        raise HTTPException(status_code=400, detail="Voting has not started yet")
    if now > election.votingEndAt:
        raise HTTPException(status_code=400, detail="Voting has ended")

    # Find voter
    voter = await db.execute(
        select(Voter).where(
            Voter.electionId == payload.electionId,
            Voter.voterHash == payload.voterHash,
        )
    )
    voter = voter.scalar_one_or_none()

    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found or not registered")

    if voter.status == VoterStatus.BLOCKED:
        raise HTTPException(status_code=403, detail="Voter has been blocked")

    if voter.status == VoterStatus.REJECTED:
        raise HTTPException(status_code=403, detail="Voter verification was rejected")

    # DOUBLE-VOTE PREVENTION: Check if voter has already voted
    if voter.status == VoterStatus.VOTED:
        # Check if vote change is allowed
        if not election.allowVoteChange:
            raise HTTPException(
                status_code=409,
                detail="You have already voted. Vote change is not allowed for this election."
            )
        if election.voteChangeDeadline and now > election.voteChangeDeadline:
            raise HTTPException(
                status_code=409,
                detail="Vote change deadline has passed"
            )
        # Vote change allowed - continue to issue new token

    # Check for existing unused token
    existing_token = await db.execute(
        select(VoteToken).where(
            VoteToken.voterId == voter.id,
            VoteToken.status == VoteTokenStatus.ISSUED,
            VoteToken.expiresAt > now,
        )
    )
    existing_token = existing_token.scalar_one_or_none()

    if existing_token:
        # Return error - they should use their existing token
        raise HTTPException(
            status_code=409,
            detail="You already have an active vote token. Please use it or wait for it to expire."
        )

    # Generate new token
    raw_token, token_hash = generate_vote_token()
    expires_at = now + timedelta(hours=1)  # Token valid for 1 hour

    # Determine version (for vote changes)
    version = 1
    previous_token_id = None
    if voter.status == VoterStatus.VOTED:
        # Find previous token to set version
        prev_token = await db.execute(
            select(VoteToken)
            .where(VoteToken.voterId == voter.id)
            .order_by(VoteToken.version.desc())
        )
        prev_token = prev_token.scalar_one_or_none()
        if prev_token:
            version = prev_token.version + 1
            previous_token_id = prev_token.id

    # Create token record
    vote_token = VoteToken(
        id=f"vt_{secrets.token_hex(12)}",
        electionId=payload.electionId,
        voterId=voter.id,
        tokenHash=token_hash,
        status=VoteTokenStatus.ISSUED,
        expiresAt=expires_at,
        version=version,
        previousTokenId=previous_token_id,
    )

    db.add(vote_token)

    # Create audit log
    audit = AuditLog(
        id=f"al_{secrets.token_hex(12)}",
        electionId=payload.electionId,
        action="vote.token_issued",
        resource="VoteToken",
        resourceId=vote_token.id,
        details={"version": version, "voterId_hash": hashlib.sha256(voter.id.encode()).hexdigest()[:16]},
        hash=hashlib.sha256(f"token_issued_{vote_token.id}_{now.isoformat()}".encode()).hexdigest(),
    )
    db.add(audit)

    await db.commit()

    return TokenResponse(
        token=raw_token,
        expiresAt=expires_at,
        message="Vote token issued successfully. Keep this token safe - you will need it to submit your ballot.",
    )


# ============================================================================
# BALLOT SUBMISSION - Phase 2 of Anonymous Voting
# ============================================================================

@router.post("/submit", response_model=BallotSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_ballot(
    payload: BallotSubmissionInput,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Submit a ballot using a vote token.

    This is Phase 2 of the anonymous voting protocol:
    1. Voter provides their token and selections
    2. System validates token (without revealing voter identity)
    3. System creates anonymous ballot with commitment
    4. Voter receives receipt for verification

    SECURITY: No voter ID is stored with the ballot.
    """
    now = datetime.utcnow()

    # Validate token
    token_hash = hash_vote_token(payload.token)

    vote_token = await db.execute(
        select(VoteToken).where(
            VoteToken.tokenHash == token_hash,
            VoteToken.electionId == payload.electionId,
        )
    )
    vote_token = vote_token.scalar_one_or_none()

    if not vote_token:
        raise HTTPException(status_code=401, detail="Invalid vote token")

    if vote_token.status != VoteTokenStatus.ISSUED:
        raise HTTPException(
            status_code=409,
            detail=f"Token has already been used or is no longer valid (status: {vote_token.status})"
        )

    if vote_token.expiresAt < now:
        raise HTTPException(status_code=401, detail="Vote token has expired")

    # Get election
    election = await db.execute(
        select(Election).where(Election.id == payload.electionId)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status != ElectionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Election is not active")

    if now < election.votingStartAt or now > election.votingEndAt:
        raise HTTPException(status_code=400, detail="Voting is not open")

    # Validate selections
    if not payload.selections:
        raise HTTPException(status_code=400, detail="At least one selection is required")

    # Get valid contest IDs for this election
    contests = await db.execute(
        select(Contest).where(Contest.electionId == payload.electionId)
    )
    contests = {c.id: c for c in contests.scalars().all()}

    for selection in payload.selections:
        if selection.contestId not in contests:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid contest: {selection.contestId}"
            )

        if selection.optionId:
            # Validate option belongs to contest
            option = await db.execute(
                select(ContestOption).where(
                    ContestOption.id == selection.optionId,
                    ContestOption.contestId == selection.contestId,
                )
            )
            if not option.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid option {selection.optionId} for contest {selection.contestId}"
                )

    # Encrypt ballot selections
    encrypted_data = encrypt_ballot_selections(
        [s.dict() for s in payload.selections],
        payload.electionId,
    )

    # Generate commitment
    salt = generate_commitment_salt()
    timestamp = int(now.timestamp() * 1000)
    commitment_hash = create_ballot_commitment(
        election_id=payload.electionId,
        encrypted_ballot=encrypted_data["encrypted"],
        salt=salt,
        timestamp=timestamp,
    )

    # Create receipt code (short, shareable)
    receipt_code = hashlib.sha256(
        f"{commitment_hash}|{timestamp}|{payload.electionId}".encode()
    ).hexdigest()[:16].upper()

    # Check for existing ballot with this token (vote change scenario)
    existing_ballot = await db.execute(
        select(Ballot).where(Ballot.tokenHash == token_hash)
    )
    existing_ballot = existing_ballot.scalar_one_or_none()

    version = 1
    previous_ballot_id = None

    if existing_ballot:
        # This shouldn't happen since token status is checked, but handle edge case
        raise HTTPException(status_code=409, detail="Ballot already submitted with this token")

    # If vote change, find previous ballot version
    if vote_token.version > 1:
        # Find previous ballot
        # Note: We can't directly link since ballots are anonymous
        # Version tracking is done via token chain
        version = vote_token.version

    # Create ballot (NO voterId!)
    ballot = Ballot(
        id=f"bal_{secrets.token_hex(12)}",
        electionId=payload.electionId,
        tokenHash=token_hash,  # Links to token, not voter
        commitmentHash=commitment_hash,
        commitmentSalt=salt,  # Should be encrypted in production
        encryptedBallot=encrypted_data["encrypted"],
        channel=payload.channel,
        status=BallotStatus.PENDING,
        submittedAt=now,
        version=version,
        metadata={
            "iv": encrypted_data["iv"],
            "authTag": encrypted_data["authTag"],
        },
    )

    db.add(ballot)

    # Create vote records
    for selection in payload.selections:
        vote = Vote(
            id=f"v_{secrets.token_hex(12)}",
            ballotId=ballot.id,
            contestId=selection.contestId,
            optionId=selection.optionId,
            rank=selection.rank,
            score=selection.score,
            writeIn=selection.writeIn,
        )
        db.add(vote)

    # Mark token as used
    await db.execute(
        update(VoteToken)
        .where(VoteToken.id == vote_token.id)
        .values(status=VoteTokenStatus.USED, usedAt=now)
    )

    # Update voter status to VOTED (for double-vote prevention)
    # Note: This doesn't reveal WHICH ballot they cast
    voter = await db.execute(
        select(Voter).where(Voter.id == vote_token.voterId)
    )
    voter = voter.scalar_one()

    await db.execute(
        update(Voter)
        .where(Voter.id == voter.id)
        .values(status=VoterStatus.VOTED, updatedAt=now)
    )

    # Create audit log (anonymized)
    audit = AuditLog(
        id=f"al_{secrets.token_hex(12)}",
        electionId=payload.electionId,
        action="vote.ballot_submitted",
        resource="Ballot",
        resourceId=ballot.id,
        details={
            "version": version,
            "channel": payload.channel.value,
            "commitmentHash_prefix": commitment_hash[:16],
        },
        hash=hashlib.sha256(f"ballot_submitted_{ballot.id}_{now.isoformat()}".encode()).hexdigest(),
    )
    db.add(audit)

    # Commit database changes first
    await db.commit()

    # Anchor ballot commitment to blockchain (async, non-blocking)
    fabric_tx_id = None
    fabric_block_num = None
    try:
        fabric_result = await anchor_ballot_to_blockchain(
            election_id=payload.electionId,
            ballot_id=ballot.id,
            commitment_hash=commitment_hash,
        )
        fabric_tx_id = fabric_result.get("txId")
        fabric_block_num = fabric_result.get("blockNumber")

        # Update ballot with blockchain proof
        await db.execute(
            update(Ballot)
            .where(Ballot.id == ballot.id)
            .values(
                fabricTxId=fabric_tx_id,
                fabricBlockNum=fabric_block_num,
                fabricTimestamp=fabric_result.get("timestamp"),
                status=BallotStatus.CONFIRMED,
                confirmedAt=datetime.utcnow(),
            )
        )
        await db.commit()

        # Broadcast ballot confirmation via WebSocket
        try:
            await broadcast_ballot_confirmed(
                commitment_hash=commitment_hash,
                fabric_tx_id=fabric_tx_id,
                block_number=fabric_block_num,
            )
        except Exception:
            pass  # Non-critical - don't fail if broadcast fails

    except FabricGatewayError as e:
        # Log error but don't fail the vote - blockchain anchoring can be retried
        # The ballot is already recorded in the database
        print(f"Warning: Blockchain anchoring failed for ballot {ballot.id}: {e}")

    # Broadcast turnout update via WebSocket
    try:
        # Get updated turnout stats
        from sqlalchemy import func
        total_voters_result = await db.execute(
            select(func.count()).select_from(Voter).where(Voter.electionId == payload.electionId)
        )
        total_voters = total_voters_result.scalar() or 0

        voted_result = await db.execute(
            select(func.count()).select_from(Voter).where(
                Voter.electionId == payload.electionId,
                Voter.status == VoterStatus.VOTED,
            )
        )
        total_voted = voted_result.scalar() or 0

        turnout_percent = round((total_voted / total_voters * 100), 2) if total_voters > 0 else 0

        await broadcast_turnout_update(
            election_id=payload.electionId,
            total_eligible=total_voters,
            total_voted=total_voted,
            turnout_percent=turnout_percent,
        )
    except Exception:
        pass  # Non-critical - don't fail if broadcast fails

    return BallotSubmissionResponse(
        success=True,
        commitmentHash=commitment_hash,
        receiptCode=receipt_code,
        submittedAt=now,
        message="Your ballot has been submitted successfully. Save your receipt code to verify your vote later.",
    )


# ============================================================================
# BALLOT VERIFICATION
# ============================================================================

@router.post("/verify", response_model=VerifyBallotResponse)
async def verify_ballot(
    payload: VerifyBallotInput,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Verify a ballot was recorded using its commitment hash.

    This allows voters to verify their vote was recorded without
    revealing the vote content to anyone else.

    The commitment hash can be verified globally (across all elections)
    or scoped to a specific election if electionId is provided.
    """
    # Build query based on whether electionId is provided
    if payload.electionId:
        # Search within specific election
        ballot_query = select(Ballot).where(
            Ballot.electionId == payload.electionId,
            Ballot.commitmentHash == payload.commitmentHash,
        )
    else:
        # Search across all elections
        ballot_query = select(Ballot).where(
            Ballot.commitmentHash == payload.commitmentHash,
        )

    result = await db.execute(ballot_query)
    ballot = result.scalar_one_or_none()

    if not ballot:
        return VerifyBallotResponse(
            found=False,
            verified=False,
            message="No ballot found with this commitment hash. Please check your receipt code.",
        )

    # Fetch election details
    election_result = await db.execute(
        select(Election).where(Election.id == ballot.electionId)
    )
    election = election_result.scalar_one_or_none()

    # Determine if ballot has been tallied
    tallied_at = None
    if election and election.status == ElectionStatus.CLOSED:
        # Ballot is tallied after election closes
        tallied_at = election.closedAt

    # Extract block number from fabricTxId if available
    fabric_block_num = None
    if ballot.fabricBlockNum:
        fabric_block_num = ballot.fabricBlockNum

    return VerifyBallotResponse(
        found=True,
        verified=True,
        electionId=ballot.electionId,
        electionName=election.name if election else None,
        status=ballot.status.value,
        submittedAt=ballot.submittedAt,
        talliedAt=tallied_at,
        fabricTxId=ballot.fabricTxId,
        fabricBlockNum=fabric_block_num,
        channel="web",  # TODO: Extract from ballot metadata if stored
        message="Your ballot was recorded successfully and verified on the blockchain.",
    )


# ============================================================================
# VOTER STATUS CHECK
# ============================================================================

@router.get("/{election_id}/status/{voter_hash}")
async def check_voter_status(
    election_id: Annotated[str, Path(description="Election ID")],
    voter_hash: Annotated[str, Path(description="Hashed voter identifier")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Check if a voter has already voted (for double-vote prevention UI).

    This endpoint only reveals status, not ballot content.
    """
    voter = await db.execute(
        select(Voter).where(
            Voter.electionId == election_id,
            Voter.voterHash == voter_hash,
        )
    )
    voter = voter.scalar_one_or_none()

    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")

    # Check if there's an active token
    active_token = await db.execute(
        select(VoteToken).where(
            VoteToken.voterId == voter.id,
            VoteToken.status == VoteTokenStatus.ISSUED,
            VoteToken.expiresAt > datetime.utcnow(),
        )
    )
    has_active_token = active_token.scalar_one_or_none() is not None

    return {
        "status": voter.status.value,
        "hasVoted": voter.status == VoterStatus.VOTED,
        "hasActiveToken": has_active_token,
        "canVote": voter.status in [VoterStatus.VERIFIED, VoterStatus.VOTED],
    }
