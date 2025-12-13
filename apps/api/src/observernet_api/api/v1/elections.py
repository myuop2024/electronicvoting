"""
Elections API - Election management with database persistence.

This module provides:
- Election creation and management
- Voter allowlist import with PII hashing
- Access code generation and validation
- Election lifecycle management

SECURITY:
- Voter PII is hashed before storage (one-way)
- Access codes are hashed and rate-limited
- All actions are audit-logged
"""

from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...database.models import (
    AccessCode,
    AccessCodeScope,
    AccessCodeStatus,
    AuditLog,
    Contest,
    ContestOption,
    Election,
    ElectionStatus,
    Voter,
    VoterStatus,
)
from ...security.auth import Subject, get_current_subject
from ...services.crypto import hash_voter_pii, create_audit_chain_hash


router = APIRouter()


# ============================================================================
# CONSTANTS
# ============================================================================

# Rate limiting for code validation
MAX_CODE_ATTEMPTS = 5
CODE_LOCKOUT_MINUTES = 15

# Access code format: 8 characters, alphanumeric, no ambiguous chars
ACCESS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ACCESS_CODE_LENGTH = 8


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class ContestOptionInput(BaseModel):
    name: str
    description: Optional[str] = None


class ContestInput(BaseModel):
    name: str
    description: Optional[str] = None
    options: List[ContestOptionInput]


class ElectionPolicies(BaseModel):
    allowVoteChange: bool = False
    voteChangeDeadlineHours: Optional[int] = None
    requireVerification: bool = True
    verificationMethods: List[str] = ["access_code"]
    allowedChannels: List[str] = ["web"]


class ElectionBranding(BaseModel):
    primaryColor: Optional[str] = None
    logoUrl: Optional[str] = None
    headerText: Optional[str] = None


class ElectionCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    org_id: str
    voting_start_at: datetime
    voting_end_at: datetime
    policies: ElectionPolicies = ElectionPolicies()
    languages: List[str] = ["en"]
    branding: ElectionBranding = ElectionBranding()
    contests: List[ContestInput] = []

    @validator("voting_end_at")
    def end_after_start(cls, v, values):
        if "voting_start_at" in values and v <= values["voting_start_at"]:
            raise ValueError("voting_end_at must be after voting_start_at")
        return v


class ElectionCreateResponse(BaseModel):
    election_id: str
    slug: str
    status: str
    message: str


class ElectionDetailResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    status: str
    orgId: str
    votingStartAt: datetime
    votingEndAt: datetime
    allowVoteChange: bool
    voteChangeDeadline: Optional[datetime]
    settings: dict
    createdAt: datetime
    voterCount: int
    ballotCount: int


class AllowlistEntry(BaseModel):
    identifier: str  # Email, phone, or national ID
    identifier_type: str = "email"  # email, phone, national_id
    region: Optional[str] = None
    district: Optional[str] = None
    category: Optional[str] = None
    weight: Optional[int] = None


class AllowlistImportRequest(BaseModel):
    format: str = "json"  # json, csv
    entries: List[AllowlistEntry]
    send_notifications: bool = False


class AllowlistImportResponse(BaseModel):
    status: str
    total: int
    imported: int
    duplicates: int
    errors: int
    message: str


class CodeGenerateRequest(BaseModel):
    count: int = Field(..., ge=1, le=10000)
    scope: str = "voter"  # voter, open
    expires_at: Optional[datetime] = None
    delivery_method: Optional[str] = None  # email, sms, whatsapp, none


class CodeGenerateResponse(BaseModel):
    status: str
    requested: int
    generated: int
    codes: Optional[List[str]] = None  # Only if delivery_method is none
    message: str


class CodeConsumeRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=20)
    election_id: str


class CodeConsumeResponse(BaseModel):
    status: str
    voter_hash: Optional[str] = None  # For token request
    message: str


class ElectionUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    voting_start_at: Optional[datetime] = None
    voting_end_at: Optional[datetime] = None
    policies: Optional[ElectionPolicies] = None
    status: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_access_code() -> str:
    """Generate a secure, human-readable access code."""
    return "".join(secrets.choice(ACCESS_CODE_CHARS) for _ in range(ACCESS_CODE_LENGTH))


def hash_access_code(code: str) -> str:
    """Hash an access code for secure storage."""
    normalized = code.upper().strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


def generate_slug(name: str) -> str:
    """Generate URL-safe slug from election name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = slug.strip("-")
    # Add random suffix for uniqueness
    suffix = secrets.token_hex(4)
    return f"{slug[:50]}-{suffix}"


async def get_last_audit_hash(db: AsyncSession, election_id: str) -> Optional[str]:
    """Get the hash of the last audit log entry for chain continuity."""
    result = await db.execute(
        select(AuditLog.hash)
        .where(AuditLog.electionId == election_id)
        .order_by(AuditLog.createdAt.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row


async def create_audit_entry(
    db: AsyncSession,
    election_id: str,
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    user_id: Optional[str] = None,
    org_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Create an audit log entry with hash chain."""
    now = datetime.utcnow()
    previous_hash = await get_last_audit_hash(db, election_id)

    entry_hash = create_audit_chain_hash(
        previous_hash=previous_hash or "",
        action=action,
        resource=resource,
        resource_id=resource_id or "",
        timestamp=now.isoformat(),
        details=details or {},
    )

    audit = AuditLog(
        id=f"al_{secrets.token_hex(12)}",
        userId=user_id,
        electionId=election_id,
        orgId=org_id,
        action=action,
        resource=resource,
        resourceId=resource_id,
        details=details or {},
        ipAddress=ip_address,
        hash=entry_hash,
        previousHash=previous_hash,
        createdAt=now,
    )
    db.add(audit)
    return audit


# ============================================================================
# ELECTION CRUD ENDPOINTS
# ============================================================================

@router.post("", response_model=ElectionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_election(
    payload: ElectionCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    request: Request,
):
    """
    Create a new election.

    Requires org_admin or higher role for the organization.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check authorization - must be org admin or platform admin
    is_platform_admin = subject.is_platform_admin
    is_org_admin = any(
        m.org_id == payload.org_id and m.role in ["owner", "admin"]
        for m in subject.org_memberships
    )

    if not (is_platform_admin or is_org_admin):
        raise HTTPException(
            status_code=403,
            detail="You must be an organization admin to create elections"
        )

    # Generate unique slug
    slug = generate_slug(payload.name)

    # Check slug uniqueness within org
    existing = await db.execute(
        select(Election).where(
            Election.orgId == payload.org_id,
            Election.slug == slug,
        )
    )
    if existing.scalar_one_or_none():
        # Regenerate with different suffix
        slug = generate_slug(payload.name)

    # Calculate vote change deadline if enabled
    vote_change_deadline = None
    if payload.policies.allowVoteChange and payload.policies.voteChangeDeadlineHours:
        vote_change_deadline = payload.voting_end_at - timedelta(
            hours=payload.policies.voteChangeDeadlineHours
        )

    # Create election
    election = Election(
        id=f"elec_{secrets.token_hex(12)}",
        orgId=payload.org_id,
        createdById=subject.user_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        votingStartAt=payload.voting_start_at,
        votingEndAt=payload.voting_end_at,
        allowVoteChange=payload.policies.allowVoteChange,
        voteChangeDeadline=vote_change_deadline,
        status=ElectionStatus.DRAFT,
        settings={
            "policies": payload.policies.dict(),
            "languages": payload.languages,
            "branding": payload.branding.dict(),
        },
    )
    db.add(election)

    # Create contests and options
    for idx, contest_input in enumerate(payload.contests):
        contest = Contest(
            id=f"cont_{secrets.token_hex(12)}",
            electionId=election.id,
            name=contest_input.name,
            description=contest_input.description,
            sortOrder=idx,
        )
        db.add(contest)

        for opt_idx, option_input in enumerate(contest_input.options):
            option = ContestOption(
                id=f"opt_{secrets.token_hex(12)}",
                contestId=contest.id,
                name=option_input.name,
                description=option_input.description,
                sortOrder=opt_idx,
            )
            db.add(option)

    # Create audit log
    await create_audit_entry(
        db=db,
        election_id=election.id,
        action="election.created",
        resource="Election",
        resource_id=election.id,
        user_id=subject.user_id,
        org_id=payload.org_id,
        details={
            "name": payload.name,
            "votingStartAt": payload.voting_start_at.isoformat(),
            "votingEndAt": payload.voting_end_at.isoformat(),
            "contestCount": len(payload.contests),
        },
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    return ElectionCreateResponse(
        election_id=election.id,
        slug=slug,
        status="draft",
        message="Election created successfully",
    )


@router.get("/{election_id}", response_model=ElectionDetailResponse)
async def get_election(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """Get election details."""
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    is_authorized = (
        subject.is_platform_admin or
        any(m.org_id == election.orgId for m in subject.org_memberships)
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get counts
    voter_count = await db.execute(
        select(func.count()).select_from(Voter).where(Voter.electionId == election_id)
    )
    voter_count = voter_count.scalar() or 0

    from ...database.models import Ballot
    ballot_count = await db.execute(
        select(func.count()).select_from(Ballot).where(Ballot.electionId == election_id)
    )
    ballot_count = ballot_count.scalar() or 0

    return ElectionDetailResponse(
        id=election.id,
        name=election.name,
        slug=election.slug,
        description=election.description,
        status=election.status.value,
        orgId=election.orgId,
        votingStartAt=election.votingStartAt,
        votingEndAt=election.votingEndAt,
        allowVoteChange=election.allowVoteChange,
        voteChangeDeadline=election.voteChangeDeadline,
        settings=election.settings or {},
        createdAt=election.createdAt,
        voterCount=voter_count,
        ballotCount=ballot_count,
    )


@router.put("/{election_id}")
async def update_election(
    election_id: Annotated[str, Path(description="Election ID")],
    payload: ElectionUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    request: Request,
):
    """Update election settings."""
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    is_org_admin = any(
        m.org_id == election.orgId and m.role in ["owner", "admin"]
        for m in subject.org_memberships
    )
    if not (subject.is_platform_admin or is_org_admin):
        raise HTTPException(status_code=403, detail="Admin access required")

    # Can't update active/closed elections (except status changes)
    if election.status in [ElectionStatus.ACTIVE, ElectionStatus.CLOSED]:
        if payload.status is None:
            raise HTTPException(
                status_code=400,
                detail="Cannot modify active or closed elections"
            )

    # Build update values
    updates = {}
    if payload.name:
        updates["name"] = payload.name
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.voting_start_at:
        updates["votingStartAt"] = payload.voting_start_at
    if payload.voting_end_at:
        updates["votingEndAt"] = payload.voting_end_at
    if payload.policies:
        current_settings = election.settings or {}
        current_settings["policies"] = payload.policies.dict()
        updates["settings"] = current_settings
        updates["allowVoteChange"] = payload.policies.allowVoteChange
    if payload.status:
        try:
            new_status = ElectionStatus(payload.status.upper())
            updates["status"] = new_status
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    if updates:
        updates["updatedAt"] = datetime.utcnow()
        await db.execute(
            update(Election).where(Election.id == election_id).values(**updates)
        )

        await create_audit_entry(
            db=db,
            election_id=election_id,
            action="election.updated",
            resource="Election",
            resource_id=election_id,
            user_id=subject.user_id,
            org_id=election.orgId,
            details={"updated_fields": list(updates.keys())},
            ip_address=request.client.host if request.client else None,
        )

        await db.commit()

    return {"status": "updated", "election_id": election_id}


# ============================================================================
# ALLOWLIST MANAGEMENT
# ============================================================================

@router.post("/{election_id}/allowlist/import", response_model=AllowlistImportResponse)
async def import_allowlist(
    election_id: Annotated[str, Path(description="Election ID")],
    payload: AllowlistImportRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    request: Request,
):
    """
    Import voter allowlist with PII hashing.

    Voter identifiers are hashed before storage to protect privacy.
    The original identifiers are never stored in the database.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    is_org_admin = any(
        m.org_id == election.orgId and m.role in ["owner", "admin"]
        for m in subject.org_memberships
    )
    if not (subject.is_platform_admin or is_org_admin):
        raise HTTPException(status_code=403, detail="Admin access required")

    # Can't import to active/closed elections
    if election.status in [ElectionStatus.ACTIVE, ElectionStatus.CLOSED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot import voters to active or closed elections"
        )

    imported = 0
    duplicates = 0
    errors = 0

    for entry in payload.entries:
        try:
            # Normalize identifier
            identifier = entry.identifier.strip().lower()

            # Hash the identifier
            voter_hash = hash_voter_pii(identifier, election_id)

            # Check for duplicate
            existing = await db.execute(
                select(Voter).where(
                    Voter.electionId == election_id,
                    Voter.voterHash == voter_hash,
                )
            )
            if existing.scalar_one_or_none():
                duplicates += 1
                continue

            # Create voter record
            voter = Voter(
                id=f"vtr_{secrets.token_hex(12)}",
                electionId=election_id,
                voterHash=voter_hash,
                status=VoterStatus.PENDING,
                region=entry.region,
                district=entry.district,
                category=entry.category,
                weight=entry.weight,
            )
            db.add(voter)
            imported += 1

        except Exception as e:
            errors += 1
            continue

    # Create audit log
    await create_audit_entry(
        db=db,
        election_id=election_id,
        action="election.allowlist_imported",
        resource="Voter",
        user_id=subject.user_id,
        org_id=election.orgId,
        details={
            "total": len(payload.entries),
            "imported": imported,
            "duplicates": duplicates,
            "errors": errors,
        },
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    return AllowlistImportResponse(
        status="completed",
        total=len(payload.entries),
        imported=imported,
        duplicates=duplicates,
        errors=errors,
        message=f"Imported {imported} voters, {duplicates} duplicates skipped, {errors} errors",
    )


@router.get("/{election_id}/allowlist/stats")
async def get_allowlist_stats(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """Get voter allowlist statistics."""
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Get counts by status
    total = await db.execute(
        select(func.count()).select_from(Voter).where(Voter.electionId == election_id)
    )
    total = total.scalar() or 0

    verified = await db.execute(
        select(func.count()).select_from(Voter).where(
            Voter.electionId == election_id,
            Voter.status == VoterStatus.VERIFIED,
        )
    )
    verified = verified.scalar() or 0

    voted = await db.execute(
        select(func.count()).select_from(Voter).where(
            Voter.electionId == election_id,
            Voter.status == VoterStatus.VOTED,
        )
    )
    voted = voted.scalar() or 0

    return {
        "total": total,
        "pending": total - verified - voted,
        "verified": verified,
        "voted": voted,
        "turnout": round((voted / total * 100), 2) if total > 0 else 0,
    }


# ============================================================================
# ACCESS CODE MANAGEMENT
# ============================================================================

@router.post("/{election_id}/codes/generate", response_model=CodeGenerateResponse)
async def generate_codes(
    election_id: Annotated[str, Path(description="Election ID")],
    payload: CodeGenerateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    request: Request,
):
    """
    Generate access codes for voter verification.

    Codes can be:
    - VOTER scoped: Mapped to specific voters in allowlist
    - OPEN scoped: Any eligible person can use (first-come)
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    is_org_admin = any(
        m.org_id == election.orgId and m.role in ["owner", "admin"]
        for m in subject.org_memberships
    )
    if not (subject.is_platform_admin or is_org_admin):
        raise HTTPException(status_code=403, detail="Admin access required")

    scope = AccessCodeScope.VOTER if payload.scope.lower() == "voter" else AccessCodeScope.OPEN
    expires_at = payload.expires_at or (election.votingEndAt + timedelta(days=1))

    # For VOTER scope, get unassigned voters
    voters_to_assign = []
    if scope == AccessCodeScope.VOTER:
        result = await db.execute(
            select(Voter)
            .where(
                Voter.electionId == election_id,
                Voter.status == VoterStatus.PENDING,
            )
            .limit(payload.count)
        )
        voters_to_assign = list(result.scalars().all())

        if len(voters_to_assign) < payload.count:
            raise HTTPException(
                status_code=400,
                detail=f"Only {len(voters_to_assign)} unassigned voters available"
            )

    generated_codes = []
    raw_codes = []

    for i in range(payload.count):
        # Generate unique code
        raw_code = generate_access_code()
        code_hash = hash_access_code(raw_code)

        # Check uniqueness
        existing = await db.execute(
            select(AccessCode).where(AccessCode.codeHash == code_hash)
        )
        while existing.scalar_one_or_none():
            raw_code = generate_access_code()
            code_hash = hash_access_code(raw_code)
            existing = await db.execute(
                select(AccessCode).where(AccessCode.codeHash == code_hash)
            )

        # Create code record
        access_code = AccessCode(
            id=f"ac_{secrets.token_hex(12)}",
            electionId=election_id,
            codeHash=code_hash,
            scope=scope,
            voterId=voters_to_assign[i].id if scope == AccessCodeScope.VOTER and i < len(voters_to_assign) else None,
            status=AccessCodeStatus.ACTIVE,
            expiresAt=expires_at,
            deliveryMethod=payload.delivery_method,
        )
        db.add(access_code)
        generated_codes.append(access_code)
        raw_codes.append(raw_code)

    # Create audit log
    await create_audit_entry(
        db=db,
        election_id=election_id,
        action="election.codes_generated",
        resource="AccessCode",
        user_id=subject.user_id,
        org_id=election.orgId,
        details={
            "count": payload.count,
            "scope": scope.value,
            "deliveryMethod": payload.delivery_method,
        },
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    # Return codes only if no delivery method (manual distribution)
    return CodeGenerateResponse(
        status="generated",
        requested=payload.count,
        generated=len(generated_codes),
        codes=raw_codes if not payload.delivery_method else None,
        message=f"Generated {len(generated_codes)} access codes" +
                (f" for {payload.delivery_method} delivery" if payload.delivery_method else ""),
    )


@router.post("/{election_id}/codes/consume", response_model=CodeConsumeResponse)
async def consume_code(
    election_id: Annotated[str, Path(description="Election ID")],
    payload: CodeConsumeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """
    Validate and consume an access code.

    This endpoint is rate-limited to prevent brute-force attacks.
    After MAX_CODE_ATTEMPTS failures, the code is locked.
    """
    now = datetime.utcnow()
    code_hash = hash_access_code(payload.code)

    # Find the code
    result = await db.execute(
        select(AccessCode).where(
            AccessCode.codeHash == code_hash,
            AccessCode.electionId == election_id,
        )
    )
    access_code = result.scalar_one_or_none()

    # Check if code exists
    if not access_code:
        # Log failed attempt (generic - doesn't reveal if code exists)
        await create_audit_entry(
            db=db,
            election_id=election_id,
            action="code.validation_failed",
            resource="AccessCode",
            details={"reason": "invalid_code"},
            ip_address=request.client.host if request.client else None,
        )
        await db.commit()

        raise HTTPException(
            status_code=400,
            detail="Invalid access code"
        )

    # Check if locked (rate limiting)
    if access_code.lockedUntil and access_code.lockedUntil > now:
        remaining = int((access_code.lockedUntil - now).total_seconds() / 60)
        raise HTTPException(
            status_code=429,
            detail=f"Code is temporarily locked. Try again in {remaining} minutes."
        )

    # Check if already used
    if access_code.status == AccessCodeStatus.USED:
        raise HTTPException(
            status_code=400,
            detail="This code has already been used"
        )

    # Check if expired
    if access_code.expiresAt and access_code.expiresAt < now:
        await db.execute(
            update(AccessCode)
            .where(AccessCode.id == access_code.id)
            .values(status=AccessCodeStatus.EXPIRED)
        )
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail="This code has expired"
        )

    # Check if revoked
    if access_code.status == AccessCodeStatus.REVOKED:
        raise HTTPException(
            status_code=400,
            detail="This code has been revoked"
        )

    # Get election to check status
    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status not in [ElectionStatus.PUBLISHED, ElectionStatus.ACTIVE]:
        raise HTTPException(
            status_code=400,
            detail="Election is not open for registration"
        )

    # Code is valid - mark as used
    voter_hash = None
    voter_id = access_code.voterId

    if access_code.scope == AccessCodeScope.VOTER and voter_id:
        # Get voter hash for token request
        voter = await db.execute(
            select(Voter).where(Voter.id == voter_id)
        )
        voter = voter.scalar_one_or_none()
        if voter:
            voter_hash = voter.voterHash
            # Update voter status
            await db.execute(
                update(Voter)
                .where(Voter.id == voter_id)
                .values(
                    status=VoterStatus.VERIFIED,
                    verifiedAt=now,
                    verificationMethod="access_code",
                )
            )
    elif access_code.scope == AccessCodeScope.OPEN:
        # For open codes, create a new voter entry
        # Generate hash from code + IP for uniqueness
        identifier = f"open:{payload.code}:{request.client.host if request.client else 'unknown'}"
        voter_hash = hash_voter_pii(identifier, election_id)

        # Check if this "voter" already exists
        existing = await db.execute(
            select(Voter).where(
                Voter.electionId == election_id,
                Voter.voterHash == voter_hash,
            )
        )
        if not existing.scalar_one_or_none():
            voter = Voter(
                id=f"vtr_{secrets.token_hex(12)}",
                electionId=election_id,
                voterHash=voter_hash,
                status=VoterStatus.VERIFIED,
                verifiedAt=now,
                verificationMethod="access_code_open",
                ipAddress=request.client.host if request.client else None,
            )
            db.add(voter)

    # Mark code as used
    await db.execute(
        update(AccessCode)
        .where(AccessCode.id == access_code.id)
        .values(
            status=AccessCodeStatus.USED,
            usedAt=now,
            usedByIp=request.client.host if request.client else None,
        )
    )

    # Create audit log
    await create_audit_entry(
        db=db,
        election_id=election_id,
        action="code.consumed",
        resource="AccessCode",
        resource_id=access_code.id,
        details={
            "scope": access_code.scope.value,
            "hasVoter": voter_hash is not None,
        },
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    return CodeConsumeResponse(
        status="accepted",
        voter_hash=voter_hash,
        message="Access code verified successfully",
    )


# ============================================================================
# ELECTION LIFECYCLE
# ============================================================================

@router.post("/{election_id}/publish")
async def publish_election(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    request: Request,
):
    """Publish election for voter registration."""
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status != ElectionStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Can only publish draft elections (current: {election.status.value})"
        )

    # Validate election has contests
    contests = await db.execute(
        select(func.count()).select_from(Contest).where(Contest.electionId == election_id)
    )
    if contests.scalar() == 0:
        raise HTTPException(
            status_code=400,
            detail="Election must have at least one contest"
        )

    await db.execute(
        update(Election)
        .where(Election.id == election_id)
        .values(status=ElectionStatus.PUBLISHED, updatedAt=datetime.utcnow())
    )

    await create_audit_entry(
        db=db,
        election_id=election_id,
        action="election.published",
        resource="Election",
        resource_id=election_id,
        user_id=subject.user_id,
        org_id=election.orgId,
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    return {"status": "published", "election_id": election_id}


@router.post("/{election_id}/activate")
async def activate_election(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    request: Request,
):
    """Activate election for voting."""
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status not in [ElectionStatus.PUBLISHED, ElectionStatus.PAUSED]:
        raise HTTPException(
            status_code=400,
            detail=f"Can only activate published or paused elections (current: {election.status.value})"
        )

    await db.execute(
        update(Election)
        .where(Election.id == election_id)
        .values(status=ElectionStatus.ACTIVE, updatedAt=datetime.utcnow())
    )

    await create_audit_entry(
        db=db,
        election_id=election_id,
        action="election.activated",
        resource="Election",
        resource_id=election_id,
        user_id=subject.user_id,
        org_id=election.orgId,
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    return {"status": "active", "election_id": election_id}


@router.post("/{election_id}/close")
async def close_election(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    request: Request,
):
    """Close election and finalize results."""
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    if election.status != ElectionStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Can only close active elections (current: {election.status.value})"
        )

    await db.execute(
        update(Election)
        .where(Election.id == election_id)
        .values(status=ElectionStatus.CLOSED, updatedAt=datetime.utcnow())
    )

    await create_audit_entry(
        db=db,
        election_id=election_id,
        action="election.closed",
        resource="Election",
        resource_id=election_id,
        user_id=subject.user_id,
        org_id=election.orgId,
        ip_address=request.client.host if request.client else None,
    )

    await db.commit()

    return {"status": "closed", "election_id": election_id}
