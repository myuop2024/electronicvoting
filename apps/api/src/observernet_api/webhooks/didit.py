"""
Didit.me webhook handler for identity verification events.

Processes webhook callbacks when users complete identity verification,
updates voter status, and registers verified subjects on the blockchain.
"""

import json
import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.connection import get_db
from ..database.models import Voter, VoterStatus, AuditLog
from ..services.didit import DiditClient
from ..services.fabric import FabricClient
from ..services.crypto import create_audit_chain_hash

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def didit_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_didit_signature: str = Header(default=""),
    x_didit_timestamp: str = Header(default=""),
):
    """
    Process Didit identity verification webhook.

    This endpoint:
    1. Verifies webhook signature (HMAC-SHA256)
    2. Validates timestamp (prevents replay attacks)
    3. Parses and validates payload
    4. Updates voter verification status in database
    5. Registers verified subject on Fabric blockchain
    6. Creates audit log entry

    Security:
    - Signature verification prevents unauthorized webhooks
    - Timestamp validation prevents replay attacks
    - Subject hash prevents PII exposure on blockchain
    """
    # Get raw payload bytes for signature verification
    payload_bytes = await request.body()

    # Verify webhook signature
    client = DiditClient()
    is_valid = await client.verify_webhook_signature(
        signature=x_didit_signature,
        payload=payload_bytes,
        timestamp=x_didit_timestamp,
        tolerance=300,  # 5 minutes
    )

    if not is_valid:
        logger.warning(
            f"Invalid Didit webhook signature. "
            f"Signature: {x_didit_signature[:20]}..."
        )
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # Parse payload
    try:
        payload_json = json.loads(payload_bytes)
        webhook_data = client.parse_webhook_payload(payload_json)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    logger.info(
        f"Received Didit webhook: session={webhook_data.session_id}, "
        f"status={webhook_data.status}"
    )

    # Find voter by subject hash (Didit subject_id maps to our voterHash)
    # The subject_id from Didit is the hashed identifier we sent during session creation
    voter_result = await db.execute(
        select(Voter).where(Voter.voterHash == webhook_data.subject_id)
    )
    voter = voter_result.scalar_one_or_none()

    if not voter:
        logger.warning(
            f"Voter not found for Didit subject: {webhook_data.subject_id[:16]}..."
        )
        # Still return 200 to acknowledge receipt
        return {"status": "accepted", "action": "voter_not_found"}

    # Update voter status based on verification result
    if webhook_data.status == "verified":
        new_status = VoterStatus.VERIFIED
        action = "verified"

        # Register subject on Fabric blockchain
        try:
            fabric_client = FabricClient()
            await fabric_client.register_subject(
                election_id=voter.electionId,
                subject_hash=voter.voterHash,
            )
            logger.info(
                f"Registered voter on Fabric: election={voter.electionId}, "
                f"subject={voter.voterHash[:16]}..."
            )
        except Exception as e:
            logger.error(f"Failed to register subject on Fabric: {e}")
            # Continue even if Fabric registration fails - voter is still verified

    elif webhook_data.status == "failed":
        new_status = VoterStatus.REJECTED
        action = "verification_failed"

    elif webhook_data.status == "expired":
        # Session expired - keep current status
        logger.info(f"Didit session expired for voter: {voter.id}")
        return {"status": "accepted", "action": "session_expired"}

    else:
        # Unknown status - log and accept
        logger.warning(f"Unknown Didit webhook status: {webhook_data.status}")
        return {"status": "accepted", "action": "unknown_status"}

    # Update voter status
    now = datetime.utcnow()
    await db.execute(
        update(Voter)
        .where(Voter.id == voter.id)
        .values(
            status=new_status,
            verifiedAt=now if new_status == VoterStatus.VERIFIED else None,
            updatedAt=now,
        )
    )

    # Create audit log entry
    # Get previous audit log hash for chain
    prev_log_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.electionId == voter.electionId)
        .order_by(AuditLog.createdAt.desc())
        .limit(1)
    )
    prev_log = prev_log_result.scalar_one_or_none()
    prev_hash = prev_log.auditHash if prev_log else None

    # Create audit hash
    audit_hash = create_audit_chain_hash(
        previous_hash=prev_hash,
        action=f"didit_{action}",
        resource_type="voter",
        resource_id=voter.id,
        timestamp=now,
        details={
            "session_id": webhook_data.session_id,
            "verification_level": webhook_data.verification_level,
            "verified_at": webhook_data.verified_at,
        },
    )

    audit_log = AuditLog(
        id=f"aud_{audit_hash[:16]}",
        electionId=voter.electionId,
        action=f"didit_{action}",
        resourceType="voter",
        resourceId=voter.id,
        performedBy="system:didit_webhook",
        details={
            "session_id": webhook_data.session_id,
            "status": webhook_data.status,
            "verification_level": webhook_data.verification_level,
        },
        auditHash=audit_hash,
        previousAuditHash=prev_hash,
        createdAt=now,
    )
    db.add(audit_log)

    await db.commit()

    logger.info(
        f"Processed Didit webhook: voter={voter.id}, "
        f"status={new_status.value}, action={action}"
    )

    return {
        "status": "accepted",
        "action": action,
        "voter_id": voter.id,
        "new_status": new_status.value,
    }
