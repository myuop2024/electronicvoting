"""
Privacy API Endpoints

Implements DSAR portal and privacy rights fulfillment endpoints.
"""

import logging
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ...database.connection import get_db
from ...privacy.jurisdiction import jurisdiction_detector, PrivacyJurisdiction
from ...privacy.rights_engine import rights_engine, DataSubjectRight
from ...privacy.models import (
    PrivacyRequest,
    PrivacyRequestType,
    PrivacyRequestStatus,
    BreachNotification,
    BreachSeverity,
    BreachStatus,
)
from ...privacy.dsar_automation import DSARAutomation
from ...services.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/privacy", tags=["privacy"])


# ============================================================================
# Request Models
# ============================================================================

class PrivacyRequestCreate(BaseModel):
    """Create privacy request."""
    email: EmailStr
    request_type: PrivacyRequestType
    description: Optional[str] = None
    self_declared_jurisdiction: Optional[PrivacyJurisdiction] = None
    voter_identifier: Optional[str] = None  # Email, phone, or unique ID


class PrivacyRequestVerify(BaseModel):
    """Verify email for privacy request."""
    verification_code: str


class JurisdictionInfo(BaseModel):
    """Jurisdiction information response."""
    jurisdiction: PrivacyJurisdiction
    applicable_rights: List[str]
    timelines: dict


class PrivacyRequestResponse(BaseModel):
    """Privacy request response."""
    id: str
    status: PrivacyRequestStatus
    request_type: PrivacyRequestType
    jurisdiction: PrivacyJurisdiction
    created_at: datetime
    due_at: datetime
    message: str


# ============================================================================
# Public Endpoints
# ============================================================================

@router.get("/jurisdiction")
async def get_jurisdiction_info(
    request: Request,
    country_code: Optional[str] = Query(None, description="ISO 3166-1 alpha-2 country code"),
    region_code: Optional[str] = Query(None, description="US state code if applicable"),
) -> JurisdictionInfo:
    """
    Get privacy jurisdiction and applicable rights.

    Detects jurisdiction from IP/geolocation and returns applicable rights.
    """
    # Get IP from request
    ip_address = request.client.host if request.client else None

    # Detect jurisdiction
    jurisdiction = jurisdiction_detector.detect(
        ip_address=ip_address,
        country_code=country_code,
        region_code=region_code,
    )

    # Get applicable rights
    rights_configs = rights_engine.get_available_rights(jurisdiction)

    applicable_rights = []
    timelines = {}

    for config in rights_configs:
        applicable_rights.append(config.right.value)
        timelines[config.right.value] = {
            "response_deadline_days": config.response_deadline.days,
            "requires_verification": config.requires_verification,
        }

    return JurisdictionInfo(
        jurisdiction=jurisdiction,
        applicable_rights=applicable_rights,
        timelines=timelines,
    )


@router.post("/request", response_model=PrivacyRequestResponse)
async def create_privacy_request(
    req: PrivacyRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> PrivacyRequestResponse:
    """
    Submit a data subject access request (DSAR).

    Initiates a privacy request with email verification.
    """
    # Detect jurisdiction
    ip_address = request.client.host if request.client else None
    jurisdiction = req.self_declared_jurisdiction or jurisdiction_detector.detect(
        ip_address=ip_address,
    )

    # Check if request type is available in jurisdiction
    request_right = DataSubjectRight[req.request_type.value]
    if not rights_engine.is_right_available(jurisdiction, request_right):
        raise HTTPException(
            status_code=400,
            detail=f"Right {req.request_type} not available in jurisdiction {jurisdiction}"
        )

    # Get response deadline
    deadline = rights_engine.get_response_deadline(jurisdiction, request_right)
    due_at = datetime.utcnow() + deadline

    # Generate verification code
    verification_code = secrets.token_hex(3).upper()  # 6-char code

    # Hash voter identifier
    voter_hash = None
    if req.voter_identifier:
        voter_hash = hashlib.sha256(
            (req.voter_identifier + "_VOTER").encode()
        ).hexdigest()

    # Create request
    privacy_request = PrivacyRequest(
        id=f"DSAR_{secrets.token_hex(12)}",
        email=req.email,
        emailVerified=False,
        requestType=req.request_type,
        jurisdiction=jurisdiction,
        status=PrivacyRequestStatus.SUBMITTED,
        description=req.description,
        voterHash=voter_hash,
        ipAddress=ip_address,
        userAgent=request.headers.get("user-agent"),
        verificationCode=hashlib.sha256(verification_code.encode()).hexdigest(),
        verificationCodeSentAt=datetime.utcnow(),
        dueAt=due_at,
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow(),
    )

    db.add(privacy_request)
    db.commit()

    # Send verification email
    try:
        await send_email(
            to=req.email,
            subject="ObserverNet Privacy Request - Verify Your Email",
            body=f"""
            Your verification code is: {verification_code}

            Please enter this code to verify your privacy request.

            Request ID: {privacy_request.id}
            Request Type: {req.request_type.value}
            Jurisdiction: {jurisdiction.value}

            This request will be processed within {deadline.days} days per {jurisdiction.value} requirements.
            """,
        )
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        # Don't fail the request, admin can manually verify

    return PrivacyRequestResponse(
        id=privacy_request.id,
        status=privacy_request.status,
        request_type=privacy_request.requestType,
        jurisdiction=privacy_request.jurisdiction,
        created_at=privacy_request.createdAt,
        due_at=privacy_request.dueAt,
        message=f"Verification code sent to {req.email}. Please verify to proceed.",
    )


@router.post("/request/{request_id}/verify")
async def verify_privacy_request(
    request_id: str,
    verify: PrivacyRequestVerify,
    db: Session = Depends(get_db),
) -> PrivacyRequestResponse:
    """
    Verify email for privacy request and trigger automated processing.
    """
    # Find request
    privacy_request = db.query(PrivacyRequest).filter(
        PrivacyRequest.id == request_id
    ).first()

    if not privacy_request:
        raise HTTPException(status_code=404, detail="Request not found")

    if privacy_request.emailVerified:
        raise HTTPException(status_code=400, detail="Request already verified")

    # Check verification code
    code_hash = hashlib.sha256(verify.verification_code.upper().encode()).hexdigest()
    if code_hash != privacy_request.verificationCode:
        privacy_request.verificationAttempts += 1
        db.commit()

        if privacy_request.verificationAttempts >= 5:
            privacy_request.status = PrivacyRequestStatus.EXPIRED
            db.commit()
            raise HTTPException(status_code=403, detail="Too many failed attempts")

        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Verify
    privacy_request.emailVerified = True
    privacy_request.emailVerifiedAt = datetime.utcnow()
    privacy_request.status = PrivacyRequestStatus.VERIFIED
    db.commit()

    # Trigger automated processing
    try:
        automation = DSARAutomation(db)
        privacy_request.status = PrivacyRequestStatus.PROCESSING
        privacy_request.processingStartedAt = datetime.utcnow()
        db.commit()

        result = await automation.process_request(privacy_request)

        # Update request with result
        if result["status"] == "completed":
            privacy_request.status = PrivacyRequestStatus.COMPLETED
            privacy_request.completedAt = datetime.utcnow()
            privacy_request.responseData = result.get("data")
            privacy_request.responseNotes = result.get("notes")

            # Generate download token
            download_token = automation.generate_download_token(privacy_request)

            # Send completion email
            await send_email(
                to=privacy_request.email,
                subject="ObserverNet Privacy Request - Completed",
                body=f"""
                Your privacy request has been completed.

                Request ID: {privacy_request.id}
                Type: {privacy_request.requestType.value}

                Download your data: {get_base_url()}/privacy/download/{privacy_request.id}?token={download_token}

                This link expires in 7 days.
                """,
            )

        elif result["status"] == "refused":
            privacy_request.status = PrivacyRequestStatus.REFUSED
            privacy_request.completedAt = datetime.utcnow()
            privacy_request.refusalReason = result.get("reason")
            privacy_request.exceptions = result.get("exceptions", [])

        elif result["status"] == "partially_completed":
            privacy_request.status = PrivacyRequestStatus.PARTIALLY_COMPLETED
            privacy_request.completedAt = datetime.utcnow()
            privacy_request.responseNotes = result.get("notes")
            privacy_request.exceptions = result.get("exceptions", [])

        db.commit()

    except Exception as e:
        logger.error(f"Error processing DSAR {request_id}: {e}")
        privacy_request.status = PrivacyRequestStatus.VERIFIED
        privacy_request.responseNotes = f"Automated processing failed: {str(e)}. Manual review required."
        db.commit()

    return PrivacyRequestResponse(
        id=privacy_request.id,
        status=privacy_request.status,
        request_type=privacy_request.requestType,
        jurisdiction=privacy_request.jurisdiction,
        created_at=privacy_request.createdAt,
        due_at=privacy_request.dueAt,
        message="Request verified and processed",
    )


@router.get("/request/{request_id}")
async def get_privacy_request_status(
    request_id: str,
    email: EmailStr = Query(..., description="Email used for request"),
    db: Session = Depends(get_db),
) -> PrivacyRequestResponse:
    """Get status of a privacy request."""
    privacy_request = db.query(PrivacyRequest).filter(
        PrivacyRequest.id == request_id,
        PrivacyRequest.email == email,
    ).first()

    if not privacy_request:
        raise HTTPException(status_code=404, detail="Request not found")

    return PrivacyRequestResponse(
        id=privacy_request.id,
        status=privacy_request.status,
        request_type=privacy_request.requestType,
        jurisdiction=privacy_request.jurisdiction,
        created_at=privacy_request.createdAt,
        due_at=privacy_request.dueAt,
        message=privacy_request.responseNotes or "Request in progress",
    )


@router.get("/download/{request_id}")
async def download_privacy_data(
    request_id: str,
    token: str = Query(..., description="Download token"),
    db: Session = Depends(get_db),
):
    """
    Download privacy request data export.

    Requires valid download token sent via email.
    """
    automation = DSARAutomation(db)
    privacy_request = automation.verify_download_token(request_id, token)

    if not privacy_request:
        raise HTTPException(status_code=403, detail="Invalid or expired download token")

    if privacy_request.status != PrivacyRequestStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Request not completed")

    # Mark as downloaded
    privacy_request.downloadedAt = datetime.utcnow()
    db.commit()

    # Return data
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=privacy_request.responseData,
        headers={
            "Content-Disposition": f"attachment; filename=observernet_privacy_data_{request_id}.json"
        }
    )


# ============================================================================
# Privacy Policy / Transparency Endpoints
# ============================================================================

@router.get("/policy")
async def get_privacy_policy():
    """
    Get comprehensive privacy policy covering all jurisdictions.
    """
    return {
        "policy_version": "2.0.0",
        "effective_date": "2025-01-01",
        "jurisdictions_covered": [j.value for j in PrivacyJurisdiction],
        "data_controller": {
            "name": "ObserverNet",
            "contact": "privacy@observernet.org",
        },
        "data_processing": {
            "purposes": [
                "Election eligibility verification",
                "Vote casting and counting",
                "Audit trail and verifiability",
                "Fraud prevention",
            ],
            "legal_bases": {
                "GDPR": "Legal obligation (Art. 6(1)(c)) and public interest (Art. 6(1)(e))",
                "CCPA": "Service delivery",
                "LGPD": "Legal obligation and legitimate interest",
                "PIPL": "Legal obligation",
            },
        },
        "anonymization": {
            "vote_content": "Cryptographically separated via blind tokens and mix-net",
            "blockchain": "Only commitments and hashes stored, no PII",
            "guarantees": "Even with full database access, votes cannot be linked to voters",
        },
        "retention": {
            "voter_profile": "Anonymized 90 days after election close",
            "vote_commitments": "Retained indefinitely for public verifiability",
            "audit_logs": "Retained per legal requirements (typically 7 years)",
        },
        "your_rights": {
            "access": "Request copy of your personal data",
            "rectification": "Correct inaccurate profile data",
            "erasure": "Delete profile data (after election + challenge period)",
            "portability": "Export your data in machine-readable format",
            "objection": "Object to processing (with limitations for legal obligations)",
            "note": "Vote content cannot be retrieved due to anonymization (by design)",
        },
        "data_sharing": {
            "third_parties": "None - we do not sell or share personal data",
            "blockchain": "Only anonymous commitments published",
            "observers": "Can verify results but cannot see individual votes",
        },
        "security": {
            "encryption": "End-to-end encryption, TLS 1.3+",
            "access_control": "Multi-factor authentication, role-based access",
            "auditing": "All actions logged with hash chains for tamper detection",
        },
        "breach_notification": {
            "GDPR": "72 hours to regulator, prompt to affected users",
            "CCPA": "Prompt notification",
            "LGPD": "Immediate to authority and subjects",
        },
        "contact": {
            "dpo_email": "dpo@observernet.org",
            "privacy_portal": "/privacy-request",
        }
    }


# ============================================================================
# Helper Functions
# ============================================================================

def get_base_url() -> str:
    """Get application base URL."""
    from ...config.settings import settings
    return settings.app_base_url
