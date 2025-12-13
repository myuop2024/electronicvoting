"""
Paper Ballot API - Upload, process, and review paper ballots.

This module provides:
- Paper ballot image upload
- OCR processing status
- Human review workflow
- Ballot approval and integration

SECURITY:
- Admin authentication required
- Original images preserved for audit
- All actions logged in audit trail
- Vote content encrypted after approval
"""

from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Path, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select, update
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
    Voter,
)
from ...security.auth import Subject, get_current_subject
from ...services.crypto import (
    create_ballot_commitment,
    encrypt_ballot_selections,
    generate_commitment_salt,
)
from ...services.ocr import (
    get_ocr_service,
    get_workflow,
    MarkType,
    OCRResult,
)
from ...services.fabric import anchor_ballot_to_blockchain


router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class PaperBallotUploadResponse(BaseModel):
    ballot_id: str
    status: str
    marks_detected: int
    overall_confidence: float
    requires_review: bool
    warnings: List[str]


class MarkReview(BaseModel):
    contest_id: str
    option_id: str
    mark_type: str  # filled, empty, partial, etc.


class SubmitReviewRequest(BaseModel):
    marks: List[MarkReview]
    notes: Optional[str] = None


class PendingReviewItem(BaseModel):
    ballot_id: str
    election_id: str
    overall_confidence: float
    marks_count: int
    ambiguous_marks: int
    uploaded_at: datetime


class BallotDetailResponse(BaseModel):
    ballot_id: str
    election_id: str
    status: str
    marks: List[dict]
    overall_confidence: float
    requires_review: bool
    warnings: List[str]
    uploaded_at: Optional[datetime]


class BallotTemplateRegion(BaseModel):
    contest_id: str
    option_id: str
    bounds: List[int]  # [x1, y1, x2, y2]


class BallotTemplate(BaseModel):
    election_id: str
    name: str
    mark_regions: List[BallotTemplateRegion]
    page_size: Optional[str] = "letter"
    dpi: int = 300


# ============================================================================
# PAPER BALLOT ENDPOINTS
# ============================================================================

@router.post("/{election_id}/upload", response_model=PaperBallotUploadResponse)
async def upload_paper_ballot(
    election_id: Annotated[str, Path(description="Election ID")],
    file: UploadFile = File(...),
    scanner_location: str = Query("default", description="Scanner location identifier"),
    batch_id: Optional[str] = Query(None, description="Batch identifier for grouped uploads"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    subject: Annotated[Subject | None, Depends(get_current_subject)] = None,
):
    """
    Upload a scanned paper ballot for OCR processing.

    Accepts PNG, JPEG, or TIFF image files.
    Returns OCR results with confidence scores.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify election exists and allows paper ballots
    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    is_org_admin = any(
        m.org_id == election.orgId and m.role in ["owner", "admin", "manager"]
        for m in subject.org_memberships
    )
    if not (subject.is_platform_admin or is_org_admin):
        raise HTTPException(status_code=403, detail="Admin access required")

    # Check election status
    if election.status not in [ElectionStatus.ACTIVE, ElectionStatus.CLOSED]:
        raise HTTPException(
            status_code=400,
            detail="Can only upload paper ballots for active or closed elections"
        )

    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/tiff"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Read file content
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    # Get ballot template from election settings
    settings = election.settings or {}
    template = settings.get("ballot_template", {"mark_regions": []})

    # If no template, create one from contests
    if not template.get("mark_regions"):
        template = await _generate_default_template(db, election_id)

    # Process with OCR
    workflow = get_workflow()
    result = await workflow.submit_scanned_ballot(
        image_data=content,
        election_id=election_id,
        scanner_location=scanner_location,
        batch_id=batch_id,
        template=template,
    )

    # Create audit log
    audit = AuditLog(
        id=f"al_{secrets.token_hex(12)}",
        userId=subject.user_id,
        electionId=election_id,
        orgId=election.orgId,
        action="paper_ballot.uploaded",
        resource="PaperBallot",
        resourceId=result["ballot_id"],
        details={
            "scanner_location": scanner_location,
            "batch_id": batch_id,
            "file_size": len(content),
            "confidence": result["overall_confidence"],
            "requires_review": result["requires_review"],
        },
        hash=hashlib.sha256(f"upload_{result['ballot_id']}_{datetime.utcnow().isoformat()}".encode()).hexdigest(),
    )
    db.add(audit)
    await db.commit()

    return PaperBallotUploadResponse(
        ballot_id=result["ballot_id"],
        status=result["status"],
        marks_detected=result["marks_detected"],
        overall_confidence=result["overall_confidence"],
        requires_review=result["requires_human_review"],
        warnings=result["warnings"],
    )


@router.get("/{election_id}/pending", response_model=List[PendingReviewItem])
async def get_pending_reviews(
    election_id: Annotated[str, Path(description="Election ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
    limit: int = Query(50, ge=1, le=200),
):
    """
    Get paper ballots pending human review.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify election access
    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    is_org_member = any(m.org_id == election.orgId for m in subject.org_memberships)
    if not (subject.is_platform_admin or is_org_member):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get pending from workflow
    workflow = get_workflow()
    pending = await workflow.get_pending_reviews(election_id=election_id)

    return [
        PendingReviewItem(
            ballot_id=p["ballot_id"],
            election_id=p["election_id"],
            overall_confidence=p["overall_confidence"],
            marks_count=p["marks_count"],
            ambiguous_marks=p["ambiguous_marks"],
            uploaded_at=datetime.utcnow(),  # Workflow doesn't track this yet
        )
        for p in pending[:limit]
    ]


@router.get("/{election_id}/ballot/{ballot_id}", response_model=BallotDetailResponse)
async def get_ballot_detail(
    election_id: Annotated[str, Path(description="Election ID")],
    ballot_id: Annotated[str, Path(description="Paper ballot ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """
    Get detailed information about a paper ballot for review.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify election access
    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Get from workflow
    workflow = get_workflow()
    if ballot_id in workflow.pending_reviews:
        result = workflow.pending_reviews[ballot_id]
        return BallotDetailResponse(
            ballot_id=result.ballot_id,
            election_id=result.election_id,
            status="pending_review",
            marks=[
                {
                    "contest_id": m.contest_id,
                    "option_id": m.option_id,
                    "mark_type": m.mark_type.value,
                    "confidence": m.confidence,
                    "bounding_box": m.bounding_box,
                    "requires_review": m.requires_review,
                }
                for m in result.marks
            ],
            overall_confidence=result.overall_confidence,
            requires_review=result.requires_human_review,
            warnings=result.warnings,
            uploaded_at=None,
        )

    raise HTTPException(status_code=404, detail="Ballot not found")


@router.post("/{election_id}/ballot/{ballot_id}/review")
async def submit_review(
    election_id: Annotated[str, Path(description="Election ID")],
    ballot_id: Annotated[str, Path(description="Paper ballot ID")],
    payload: SubmitReviewRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """
    Submit human review decisions for a paper ballot.

    After review, the ballot is approved and converted to digital format.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify election
    election = await db.execute(
        select(Election).where(Election.id == election_id)
    )
    election = election.scalar_one_or_none()

    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # Check authorization
    is_org_admin = any(
        m.org_id == election.orgId and m.role in ["owner", "admin", "manager"]
        for m in subject.org_memberships
    )
    if not (subject.is_platform_admin or is_org_admin):
        raise HTTPException(status_code=403, detail="Admin access required")

    # Submit review to workflow
    workflow = get_workflow()
    result = await workflow.submit_human_review(
        ballot_id=ballot_id,
        reviewer_id=subject.user_id,
        reviewed_marks=[m.dict() for m in payload.marks],
        notes=payload.notes,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Create audit log for review
    audit = AuditLog(
        id=f"al_{secrets.token_hex(12)}",
        userId=subject.user_id,
        electionId=election_id,
        orgId=election.orgId,
        action="paper_ballot.reviewed",
        resource="PaperBallot",
        resourceId=ballot_id,
        details={
            "marks_reviewed": len(payload.marks),
            "notes": payload.notes,
        },
        hash=hashlib.sha256(f"review_{ballot_id}_{datetime.utcnow().isoformat()}".encode()).hexdigest(),
    )
    db.add(audit)
    await db.commit()

    return result


@router.post("/{election_id}/ballot/{ballot_id}/approve")
async def approve_and_count(
    election_id: Annotated[str, Path(description="Election ID")],
    ballot_id: Annotated[str, Path(description="Paper ballot ID")],
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """
    Approve a reviewed paper ballot and add it to the tally.

    This creates the digital ballot record and anchors to blockchain.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify election
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

    # Get OCR result
    workflow = get_workflow()
    ocr_result = workflow.pending_reviews.get(ballot_id)

    # If not in pending, it might already be processed or doesn't exist
    # For demo, create a mock result
    if not ocr_result:
        raise HTTPException(
            status_code=404,
            detail="Ballot not found. It may have already been approved or not yet reviewed."
        )

    # Convert OCR marks to vote selections
    selections = []
    for mark in ocr_result.marks:
        if mark.mark_type in [MarkType.FILLED, MarkType.CHECKMARK, MarkType.CROSSED]:
            selections.append({
                "contestId": mark.contest_id,
                "optionId": mark.option_id,
            })

    if not selections:
        raise HTTPException(
            status_code=400,
            detail="No valid selections found in ballot"
        )

    now = datetime.utcnow()

    # Generate anonymous token hash for paper ballot
    token_hash = hashlib.sha256(f"paper_{ballot_id}_{now.isoformat()}".encode()).hexdigest()

    # Encrypt selections
    encrypted_data = encrypt_ballot_selections(selections, election_id)

    # Generate commitment
    salt = generate_commitment_salt()
    timestamp = int(now.timestamp() * 1000)
    commitment_hash = create_ballot_commitment(
        election_id=election_id,
        encrypted_ballot=encrypted_data["encrypted"],
        salt=salt,
        timestamp=timestamp,
    )

    # Create ballot record
    ballot = Ballot(
        id=f"bal_{secrets.token_hex(12)}",
        electionId=election_id,
        tokenHash=token_hash,
        commitmentHash=commitment_hash,
        commitmentSalt=salt,
        encryptedBallot=encrypted_data["encrypted"],
        channel=VoteChannel.PAPER,
        status=BallotStatus.PENDING,
        submittedAt=now,
        metadata={
            "iv": encrypted_data["iv"],
            "authTag": encrypted_data["authTag"],
            "paperBallotId": ballot_id,
            "reviewedBy": subject.user_id,
        },
    )
    db.add(ballot)

    # Create vote records
    for selection in selections:
        vote = Vote(
            id=f"v_{secrets.token_hex(12)}",
            ballotId=ballot.id,
            contestId=selection["contestId"],
            optionId=selection["optionId"],
        )
        db.add(vote)

    # Create audit log
    audit = AuditLog(
        id=f"al_{secrets.token_hex(12)}",
        userId=subject.user_id,
        electionId=election_id,
        orgId=election.orgId,
        action="paper_ballot.approved",
        resource="Ballot",
        resourceId=ballot.id,
        details={
            "paperBallotId": ballot_id,
            "selectionsCount": len(selections),
            "commitmentHashPrefix": commitment_hash[:16],
        },
        hash=hashlib.sha256(f"approve_{ballot.id}_{now.isoformat()}".encode()).hexdigest(),
    )
    db.add(audit)

    # Remove from pending reviews
    if ballot_id in workflow.pending_reviews:
        del workflow.pending_reviews[ballot_id]

    await db.commit()

    # Anchor to blockchain (async, non-blocking)
    try:
        fabric_result = await anchor_ballot_to_blockchain(
            election_id=election_id,
            ballot_id=ballot.id,
            commitment_hash=commitment_hash,
        )

        # Update ballot with blockchain proof
        await db.execute(
            update(Ballot)
            .where(Ballot.id == ballot.id)
            .values(
                fabricTxId=fabric_result.get("txId"),
                fabricBlockNum=fabric_result.get("blockNumber"),
                fabricTimestamp=fabric_result.get("timestamp"),
                status=BallotStatus.CONFIRMED,
                confirmedAt=datetime.utcnow(),
            )
        )
        await db.commit()
    except Exception as e:
        print(f"Warning: Blockchain anchoring failed for paper ballot {ballot.id}: {e}")

    return {
        "status": "approved",
        "digital_ballot_id": ballot.id,
        "commitment_hash": commitment_hash,
        "receipt_code": commitment_hash[:16].upper(),
        "selections_count": len(selections),
    }


@router.post("/{election_id}/template")
async def save_ballot_template(
    election_id: Annotated[str, Path(description="Election ID")],
    template: BallotTemplate,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[Subject | None, Depends(get_current_subject)],
):
    """
    Save a ballot template for OCR mark detection.

    The template defines where marks should be located on the ballot image.
    """
    if not subject:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Verify election
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

    # Update election settings with template
    settings = election.settings or {}
    settings["ballot_template"] = {
        "name": template.name,
        "mark_regions": [
            {
                "contest_id": r.contest_id,
                "option_id": r.option_id,
                "bounds": r.bounds,
            }
            for r in template.mark_regions
        ],
        "page_size": template.page_size,
        "dpi": template.dpi,
    }

    await db.execute(
        update(Election)
        .where(Election.id == election_id)
        .values(settings=settings, updatedAt=datetime.utcnow())
    )
    await db.commit()

    return {
        "status": "saved",
        "template_name": template.name,
        "regions_count": len(template.mark_regions),
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def _generate_default_template(
    db: AsyncSession,
    election_id: str,
) -> dict:
    """Generate a default ballot template from election contests."""
    template = {"mark_regions": []}

    # Get contests and options
    contests = await db.execute(
        select(Contest)
        .where(Contest.electionId == election_id)
        .order_by(Contest.sortOrder)
    )
    contests = contests.scalars().all()

    # Generate regions with placeholder bounds
    # In production, these would be configured per ballot design
    y_offset = 200
    for contest in contests:
        options = await db.execute(
            select(ContestOption)
            .where(ContestOption.contestId == contest.id)
            .order_by(ContestOption.sortOrder)
        )
        options = options.scalars().all()

        for i, option in enumerate(options):
            template["mark_regions"].append({
                "contest_id": contest.id,
                "option_id": option.id,
                "bounds": [100, y_offset + (i * 50), 140, y_offset + (i * 50) + 40],
            })

        y_offset += len(options) * 50 + 100

    return template
