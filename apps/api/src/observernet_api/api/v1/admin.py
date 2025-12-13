"""
Admin API - Dashboard and management endpoints for organization admins.

This module provides:
- Admin dashboard with real-time statistics
- Election management overview
- Audit log access
- Offline ballot processing status
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...database.models import (
    AccessCode,
    AccessCodeStatus,
    AuditLog,
    Ballot,
    BallotStatus,
    Election,
    ElectionStatus,
    Voter,
    VoterStatus,
    VoteChannel,
)
from ...security.auth import Subject, get_current_subject


router = APIRouter()


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class DashboardStats(BaseModel):
    activeElections: int
    pendingReviews: int
    turnout: float
    offlineBallotsPending: int
    totalVoters: int
    totalVotes: int
    verifiedVoters: int


class ElectionSummary(BaseModel):
    id: str
    name: str
    slug: str
    status: str
    votingStartAt: datetime
    votingEndAt: datetime
    voterCount: int
    voteCount: int
    turnoutPercent: float


class AuditLogEntry(BaseModel):
    id: str
    action: str
    resource: str
    resourceId: Optional[str]
    userId: Optional[str]
    details: dict
    ipAddress: Optional[str]
    createdAt: datetime


class PendingReviewItem(BaseModel):
    id: str
    type: str  # offline_ballot, dispute, verification
    electionId: str
    electionName: str
    description: str
    priority: str
    createdAt: datetime


# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

@router.get("/dashboard", response_model=DashboardStats)
async def admin_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """
    Get admin dashboard statistics.

    Returns real-time counts for elections, voters, and pending reviews.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Get org IDs for this admin
    org_ids = [m.org_id for m in subject.org_memberships]

    if not org_ids and not subject.is_platform_admin:
        return DashboardStats(
            activeElections=0,
            pendingReviews=0,
            turnout=0,
            offlineBallotsPending=0,
            totalVoters=0,
            totalVotes=0,
            verifiedVoters=0,
        )

    # Build org filter
    if subject.is_platform_admin:
        org_filter = True  # No filter for platform admins
    else:
        org_filter = Election.orgId.in_(org_ids)

    # Count active elections
    active_elections = await db.execute(
        select(func.count())
        .select_from(Election)
        .where(
            and_(
                org_filter,
                Election.status == ElectionStatus.ACTIVE,
            )
        )
    )
    active_elections = active_elections.scalar() or 0

    # Get election IDs for further queries
    if subject.is_platform_admin:
        election_ids_query = select(Election.id)
    else:
        election_ids_query = select(Election.id).where(Election.orgId.in_(org_ids))

    election_ids_result = await db.execute(election_ids_query)
    election_ids = [row[0] for row in election_ids_result.fetchall()]

    if not election_ids:
        return DashboardStats(
            activeElections=active_elections,
            pendingReviews=0,
            turnout=0,
            offlineBallotsPending=0,
            totalVoters=0,
            totalVotes=0,
            verifiedVoters=0,
        )

    # Count total voters across all elections
    total_voters = await db.execute(
        select(func.count())
        .select_from(Voter)
        .where(Voter.electionId.in_(election_ids))
    )
    total_voters = total_voters.scalar() or 0

    # Count verified voters
    verified_voters = await db.execute(
        select(func.count())
        .select_from(Voter)
        .where(
            and_(
                Voter.electionId.in_(election_ids),
                Voter.status.in_([VoterStatus.VERIFIED, VoterStatus.VOTED]),
            )
        )
    )
    verified_voters = verified_voters.scalar() or 0

    # Count total votes (confirmed ballots)
    total_votes = await db.execute(
        select(func.count())
        .select_from(Ballot)
        .where(
            and_(
                Ballot.electionId.in_(election_ids),
                Ballot.status.in_([BallotStatus.CONFIRMED, BallotStatus.TALLIED]),
            )
        )
    )
    total_votes = total_votes.scalar() or 0

    # Calculate overall turnout
    turnout = round((total_votes / total_voters * 100), 1) if total_voters > 0 else 0

    # Count offline ballots pending review
    offline_pending = await db.execute(
        select(func.count())
        .select_from(Ballot)
        .where(
            and_(
                Ballot.electionId.in_(election_ids),
                Ballot.channel.in_([VoteChannel.OFFLINE, VoteChannel.PAPER]),
                Ballot.status == BallotStatus.PENDING,
            )
        )
    )
    offline_pending = offline_pending.scalar() or 0

    # Count pending reviews (ballots pending + unused access codes expiring soon)
    expiring_codes = await db.execute(
        select(func.count())
        .select_from(AccessCode)
        .where(
            and_(
                AccessCode.electionId.in_(election_ids),
                AccessCode.status == AccessCodeStatus.ACTIVE,
                AccessCode.expiresAt < datetime.utcnow() + timedelta(hours=24),
            )
        )
    )
    expiring_codes = expiring_codes.scalar() or 0

    pending_reviews = offline_pending + expiring_codes

    return DashboardStats(
        activeElections=active_elections,
        pendingReviews=pending_reviews,
        turnout=turnout,
        offlineBallotsPending=offline_pending,
        totalVoters=total_voters,
        totalVotes=total_votes,
        verifiedVoters=verified_voters,
    )


@router.get("/elections", response_model=List[ElectionSummary])
async def list_elections(
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List elections accessible to the current admin.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Build query
    query = select(Election)

    # Apply org filter
    if not subject.is_platform_admin:
        org_ids = [m.org_id for m in subject.org_memberships]
        query = query.where(Election.orgId.in_(org_ids))

    # Apply status filter
    if status:
        try:
            status_enum = ElectionStatus(status.upper())
            query = query.where(Election.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    # Order and paginate
    query = query.order_by(Election.createdAt.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    elections = result.scalars().all()

    # Get stats for each election
    summaries = []
    for election in elections:
        voter_count = await db.execute(
            select(func.count())
            .select_from(Voter)
            .where(Voter.electionId == election.id)
        )
        voter_count = voter_count.scalar() or 0

        vote_count = await db.execute(
            select(func.count())
            .select_from(Ballot)
            .where(
                and_(
                    Ballot.electionId == election.id,
                    Ballot.status.in_([BallotStatus.CONFIRMED, BallotStatus.TALLIED]),
                )
            )
        )
        vote_count = vote_count.scalar() or 0

        turnout = round((vote_count / voter_count * 100), 2) if voter_count > 0 else 0

        summaries.append(ElectionSummary(
            id=election.id,
            name=election.name,
            slug=election.slug,
            status=election.status.value,
            votingStartAt=election.votingStartAt,
            votingEndAt=election.votingEndAt,
            voterCount=voter_count,
            voteCount=vote_count,
            turnoutPercent=turnout,
        ))

    return summaries


@router.get("/pending-reviews", response_model=List[PendingReviewItem])
async def get_pending_reviews(
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get items requiring admin review.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Get accessible election IDs
    if subject.is_platform_admin:
        election_ids_query = select(Election.id, Election.name)
    else:
        org_ids = [m.org_id for m in subject.org_memberships]
        election_ids_query = select(Election.id, Election.name).where(Election.orgId.in_(org_ids))

    elections_result = await db.execute(election_ids_query)
    elections_map = {row[0]: row[1] for row in elections_result.fetchall()}

    if not elections_map:
        return []

    items = []

    # Get offline/paper ballots pending review
    offline_ballots = await db.execute(
        select(Ballot)
        .where(
            and_(
                Ballot.electionId.in_(elections_map.keys()),
                Ballot.channel.in_([VoteChannel.OFFLINE, VoteChannel.PAPER]),
                Ballot.status == BallotStatus.PENDING,
            )
        )
        .order_by(Ballot.submittedAt.asc())
        .limit(limit)
    )

    for ballot in offline_ballots.scalars().all():
        items.append(PendingReviewItem(
            id=ballot.id,
            type="offline_ballot",
            electionId=ballot.electionId,
            electionName=elections_map.get(ballot.electionId, "Unknown"),
            description=f"{ballot.channel.value} ballot pending review",
            priority="high" if ballot.channel == VoteChannel.PAPER else "medium",
            createdAt=ballot.submittedAt,
        ))

    # Get expiring access codes
    expiring_codes = await db.execute(
        select(AccessCode)
        .where(
            and_(
                AccessCode.electionId.in_(elections_map.keys()),
                AccessCode.status == AccessCodeStatus.ACTIVE,
                AccessCode.expiresAt < datetime.utcnow() + timedelta(hours=24),
            )
        )
        .order_by(AccessCode.expiresAt.asc())
        .limit(limit)
    )

    for code in expiring_codes.scalars().all():
        items.append(PendingReviewItem(
            id=code.id,
            type="expiring_code",
            electionId=code.electionId,
            electionName=elections_map.get(code.electionId, "Unknown"),
            description="Access code expiring soon",
            priority="low",
            createdAt=code.createdAt,
        ))

    # Sort by priority and date
    priority_order = {"high": 0, "medium": 1, "low": 2}
    items.sort(key=lambda x: (priority_order.get(x.priority, 99), x.createdAt))

    return items[:limit]


@router.get("/audit-log", response_model=List[AuditLogEntry])
async def get_audit_log(
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    election_id: Optional[str] = Query(None, description="Filter by election"),
    action: Optional[str] = Query(None, description="Filter by action"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Get audit log entries.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Build query
    query = select(AuditLog)

    # Apply election filter
    if election_id:
        # Verify access to this election
        election = await db.execute(
            select(Election).where(Election.id == election_id)
        )
        election = election.scalar_one_or_none()

        if not election:
            raise HTTPException(status_code=404, detail="Election not found")

        if not subject.is_platform_admin:
            org_ids = [m.org_id for m in subject.org_memberships]
            if election.orgId not in org_ids:
                raise HTTPException(status_code=403, detail="Access denied")

        query = query.where(AuditLog.electionId == election_id)
    else:
        # Filter by accessible elections
        if not subject.is_platform_admin:
            org_ids = [m.org_id for m in subject.org_memberships]
            election_ids_result = await db.execute(
                select(Election.id).where(Election.orgId.in_(org_ids))
            )
            election_ids = [row[0] for row in election_ids_result.fetchall()]
            query = query.where(
                or_(
                    AuditLog.electionId.in_(election_ids),
                    AuditLog.orgId.in_(org_ids),
                )
            )

    # Apply action filter
    if action:
        query = query.where(AuditLog.action.contains(action))

    # Order and paginate
    query = query.order_by(AuditLog.createdAt.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        AuditLogEntry(
            id=log.id,
            action=log.action,
            resource=log.resource,
            resourceId=log.resourceId,
            userId=log.userId,
            details=log.details or {},
            ipAddress=log.ipAddress,
            createdAt=log.createdAt,
        )
        for log in logs
    ]


@router.get("/stats/daily")
async def get_daily_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    election_id: Optional[str] = Query(None, description="Filter by election"),
    days: int = Query(7, ge=1, le=30),
):
    """
    Get daily voting statistics for charts.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Build base filter
    if election_id:
        election = await db.execute(
            select(Election).where(Election.id == election_id)
        )
        election = election.scalar_one_or_none()

        if not election:
            raise HTTPException(status_code=404, detail="Election not found")

        if not subject.is_platform_admin:
            org_ids = [m.org_id for m in subject.org_memberships]
            if election.orgId not in org_ids:
                raise HTTPException(status_code=403, detail="Access denied")

        election_filter = Ballot.electionId == election_id
    else:
        if subject.is_platform_admin:
            election_filter = True
        else:
            org_ids = [m.org_id for m in subject.org_memberships]
            election_ids_result = await db.execute(
                select(Election.id).where(Election.orgId.in_(org_ids))
            )
            election_ids = [row[0] for row in election_ids_result.fetchall()]
            election_filter = Ballot.electionId.in_(election_ids)

    # Get daily counts
    start_date = datetime.utcnow() - timedelta(days=days)

    # This is a simplified version - in production, use proper date grouping
    daily_stats = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        next_date = date + timedelta(days=1)

        count = await db.execute(
            select(func.count())
            .select_from(Ballot)
            .where(
                and_(
                    election_filter,
                    Ballot.submittedAt >= date,
                    Ballot.submittedAt < next_date,
                )
            )
        )
        count = count.scalar() or 0

        daily_stats.append({
            "date": date.strftime("%Y-%m-%d"),
            "votes": count,
        })

    return {
        "period": f"{days} days",
        "data": daily_stats,
    }
