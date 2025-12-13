"""
Election Results API - Real-time and final results with blockchain verification.

This module provides:
- Real-time voting statistics (turnout, channel breakdown)
- Final results after election closes
- Blockchain verification status
- Embeddable chart data

SECURITY:
- Detailed results only available after election closes
- Prevents early result leakage that could influence voters
- Results anchored to blockchain for immutability
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Annotated, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...database.models import (
    Ballot,
    BallotStatus,
    Contest,
    ContestOption,
    Election,
    ElectionStatus,
    Vote,
    VoteChannel,
    Voter,
    VoterStatus,
)
from ...security.auth import Subject, get_current_subject
from ...services.fabric import get_fabric_client


router = APIRouter()


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class ChannelStats(BaseModel):
    channel: str
    votes: int
    percentage: float


class TurnoutStats(BaseModel):
    totalVoters: int
    totalVotes: int
    turnoutPercent: float
    byChannel: List[ChannelStats]


class ContestOptionResult(BaseModel):
    id: str
    name: str
    votes: int
    percentage: float


class ContestResult(BaseModel):
    id: str
    name: str
    totalVotes: int
    options: List[ContestOptionResult]


class ElectionResults(BaseModel):
    electionId: str
    electionName: str
    status: str
    votingEndAt: datetime
    turnout: TurnoutStats
    contests: Optional[List[ContestResult]] = None
    blockchainVerified: bool
    fabricTxId: Optional[str] = None
    resultsHash: Optional[str] = None


class EmbedChartData(BaseModel):
    type: str
    label: str
    data: List[dict]


class EmbedResponse(BaseModel):
    election: dict
    charts: List[EmbedChartData]


# ============================================================================
# RESULTS ENDPOINTS
# ============================================================================

@router.get("/{election_id}", response_model=ElectionResults)
async def get_results(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)] = None,
):
    """
    Get election results.

    For active elections, only turnout statistics are returned.
    Full contest results are only available after the election closes.
    """
    # Find election
    result = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Only show results for published+ elections
    if election.status == ElectionStatus.DRAFT:
        raise HTTPException(status_code=404, detail="Election not found")

    # Get total voters
    total_voters = await db.execute(
        select(func.count())
        .select_from(Voter)
        .where(Voter.electionId == election_id)
    )
    total_voters = total_voters.scalar() or 0

    # Get confirmed ballots
    total_votes = await db.execute(
        select(func.count())
        .select_from(Ballot)
        .where(
            and_(
                Ballot.electionId == election_id,
                Ballot.status.in_([BallotStatus.CONFIRMED, BallotStatus.TALLIED]),
            )
        )
    )
    total_votes = total_votes.scalar() or 0

    turnout_percent = round((total_votes / total_voters * 100), 2) if total_voters > 0 else 0

    # Get channel breakdown
    channel_stats = []
    for channel in VoteChannel:
        count = await db.execute(
            select(func.count())
            .select_from(Ballot)
            .where(
                and_(
                    Ballot.electionId == election_id,
                    Ballot.channel == channel,
                    Ballot.status.in_([BallotStatus.CONFIRMED, BallotStatus.TALLIED]),
                )
            )
        )
        count = count.scalar() or 0
        if count > 0:
            channel_stats.append(ChannelStats(
                channel=channel.value,
                votes=count,
                percentage=round((count / total_votes * 100), 2) if total_votes > 0 else 0,
            ))

    turnout = TurnoutStats(
        totalVoters=total_voters,
        totalVotes=total_votes,
        turnoutPercent=turnout_percent,
        byChannel=channel_stats,
    )

    # Check if detailed results should be shown
    # Only show after election closes to prevent early result leakage
    contests_results = None
    blockchain_verified = False
    fabric_tx_id = None
    results_hash = None

    if election.status == ElectionStatus.CLOSED:
        # Get contest results
        contests_results = []

        contests = await db.execute(
            select(Contest)
            .where(Contest.electionId == election_id)
            .order_by(Contest.sortOrder)
        )
        contests = contests.scalars().all()

        for contest in contests:
            # Get options with vote counts
            options_results = []

            options = await db.execute(
                select(ContestOption)
                .where(ContestOption.contestId == contest.id)
                .order_by(ContestOption.sortOrder)
            )
            options = options.scalars().all()

            contest_total = 0
            option_votes = []

            for option in options:
                vote_count = await db.execute(
                    select(func.count())
                    .select_from(Vote)
                    .where(
                        and_(
                            Vote.contestId == contest.id,
                            Vote.optionId == option.id,
                        )
                    )
                )
                votes = vote_count.scalar() or 0
                contest_total += votes
                option_votes.append((option, votes))

            for option, votes in option_votes:
                options_results.append(ContestOptionResult(
                    id=option.id,
                    name=option.name,
                    votes=votes,
                    percentage=round((votes / contest_total * 100), 2) if contest_total > 0 else 0,
                ))

            contests_results.append(ContestResult(
                id=contest.id,
                name=contest.name,
                totalVotes=contest_total,
                options=options_results,
            ))

        # Check blockchain verification
        fabric_client = get_fabric_client()
        blockchain_result = await fabric_client.get_election_results(election_id)
        if blockchain_result:
            blockchain_verified = True
            fabric_tx_id = blockchain_result.get("txId")
            results_hash = blockchain_result.get("data", {}).get("resultHash")

    return ElectionResults(
        electionId=election.id,
        electionName=election.name,
        status=election.status.value,
        votingEndAt=election.votingEndAt,
        turnout=turnout,
        contests=contests_results,
        blockchainVerified=blockchain_verified,
        fabricTxId=fabric_tx_id,
        resultsHash=results_hash,
    )


@router.get("/{election_id}/embed", response_model=EmbedResponse)
async def get_results_embed(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get embeddable chart data for election results.

    Returns pre-formatted data for chart rendering.
    """
    # Find election
    result = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status == ElectionStatus.DRAFT:
        raise HTTPException(status_code=404, detail="Election not found")

    charts = []

    # Turnout by channel chart
    channel_data = []
    for channel in VoteChannel:
        count = await db.execute(
            select(func.count())
            .select_from(Ballot)
            .where(
                and_(
                    Ballot.electionId == election_id,
                    Ballot.channel == channel,
                    Ballot.status.in_([BallotStatus.CONFIRMED, BallotStatus.TALLIED]),
                )
            )
        )
        count = count.scalar() or 0
        if count > 0:
            channel_data.append({
                "channel": channel.value,
                "votes": count,
                "label": channel.value.replace("_", " ").title(),
            })

    if channel_data:
        charts.append(EmbedChartData(
            type="bar",
            label="Votes by Channel",
            data=channel_data,
        ))

    # Contest results charts (only if closed)
    if election.status == ElectionStatus.CLOSED:
        contests = await db.execute(
            select(Contest)
            .where(Contest.electionId == election_id)
            .order_by(Contest.sortOrder)
        )
        contests = contests.scalars().all()

        for contest in contests:
            options = await db.execute(
                select(ContestOption)
                .where(ContestOption.contestId == contest.id)
                .order_by(ContestOption.sortOrder)
            )
            options = options.scalars().all()

            contest_data = []
            for option in options:
                vote_count = await db.execute(
                    select(func.count())
                    .select_from(Vote)
                    .where(
                        and_(
                            Vote.contestId == contest.id,
                            Vote.optionId == option.id,
                        )
                    )
                )
                votes = vote_count.scalar() or 0
                contest_data.append({
                    "option": option.name,
                    "votes": votes,
                })

            if contest_data:
                charts.append(EmbedChartData(
                    type="pie",
                    label=contest.name,
                    data=contest_data,
                ))

    return EmbedResponse(
        election={
            "id": election.id,
            "name": election.name,
            "status": election.status.value,
            "votingEndAt": election.votingEndAt.isoformat(),
        },
        charts=charts,
    )


@router.get("/{election_id}/turnout")
async def get_turnout(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get real-time turnout statistics.

    This endpoint is safe to call during active voting.
    """
    # Find election
    result = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Get counts
    total_voters = await db.execute(
        select(func.count())
        .select_from(Voter)
        .where(Voter.electionId == election_id)
    )
    total_voters = total_voters.scalar() or 0

    voted = await db.execute(
        select(func.count())
        .select_from(Voter)
        .where(
            and_(
                Voter.electionId == election_id,
                Voter.status == VoterStatus.VOTED,
            )
        )
    )
    voted = voted.scalar() or 0

    verified = await db.execute(
        select(func.count())
        .select_from(Voter)
        .where(
            and_(
                Voter.electionId == election_id,
                Voter.status == VoterStatus.VERIFIED,
            )
        )
    )
    verified = verified.scalar() or 0

    return {
        "electionId": election_id,
        "totalVoters": total_voters,
        "verified": verified,
        "voted": voted,
        "pending": total_voters - verified - voted,
        "turnoutPercent": round((voted / total_voters * 100), 2) if total_voters > 0 else 0,
        "votingOpen": election.status == ElectionStatus.ACTIVE,
    }


@router.post("/{election_id}/certify")
async def certify_results(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """
    Certify and anchor election results to blockchain.

    This creates an immutable record of the final tallies.
    Requires admin access and election must be closed.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Find election
    result = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = result.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    if not subject.is_platform_admin:
        org_ids = [m.org_id for m in subject.org_memberships if m.role in ["owner", "admin"]]
        if election.orgId not in org_ids:
            raise HTTPException(status_code=403, detail="Admin access required")

    # Must be closed
    if election.status != ElectionStatus.CLOSED:
        raise HTTPException(
            status_code=400,
            detail="Can only certify closed elections"
        )

    # Check if already certified
    fabric_client = get_fabric_client()
    existing = await fabric_client.get_election_results(election_id)
    if existing:
        return {
            "status": "already_certified",
            "fabricTxId": existing.get("txId"),
            "certifiedAt": existing.get("data", {}).get("certifiedAt"),
        }

    # Calculate final tallies
    tallies: Dict[str, int] = {}

    contests = await db.execute(
        select(Contest).where(Contest.electionId == election_id)
    )
    contests = contests.scalars().all()

    for contest in contests:
        options = await db.execute(
            select(ContestOption).where(ContestOption.contestId == contest.id)
        )
        options = options.scalars().all()

        for option in options:
            vote_count = await db.execute(
                select(func.count())
                .select_from(Vote)
                .where(
                    and_(
                        Vote.contestId == contest.id,
                        Vote.optionId == option.id,
                    )
                )
            )
            tallies[f"{contest.id}:{option.id}"] = vote_count.scalar() or 0

    # Create results hash
    import json
    results_payload = json.dumps({
        "electionId": election_id,
        "tallies": tallies,
        "certifiedAt": datetime.utcnow().isoformat(),
    }, sort_keys=True)
    results_hash = hashlib.sha256(results_payload.encode()).hexdigest()

    # Submit to blockchain
    fabric_result = await fabric_client.submit_election_result(
        election_id=election_id,
        result_hash=results_hash,
        tallies=tallies,
        metadata={
            "electionName": election.name,
            "votingEndAt": election.votingEndAt.isoformat(),
            "certifiedBy": subject.user_id,
        },
    )

    return {
        "status": "certified",
        "resultsHash": results_hash,
        "fabricTxId": fabric_result.get("txId"),
        "blockNumber": fabric_result.get("blockNumber"),
        "certifiedAt": datetime.utcnow().isoformat(),
    }
