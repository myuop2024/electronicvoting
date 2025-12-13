"""
DSAR Automation Workflow

Automated fulfillment of Data Subject Access Requests with proper
exception handling for vote anonymity and election integrity.
"""

import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import secrets
import hashlib

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .models import (
    PrivacyRequest,
    PrivacyRequestType,
    PrivacyRequestStatus,
)
from .jurisdiction import PrivacyJurisdiction
from .rights_engine import DataSubjectRight, rights_engine
from ..database.models import Voter, VoteToken, AuditLog, AccessCode

logger = logging.getLogger(__name__)


class DSARAutomation:
    """
    Automated DSAR fulfillment engine.

    Key principle: Provide maximum transparency while protecting vote anonymity.
    - Profile data: Full access/portability
    - Vote data: NEVER linked to identity (explain anonymization)
    - Audit logs: Redacted (no vote content)
    """

    def __init__(self, db: Session):
        """Initialize DSAR automation."""
        self.db = db

    async def process_request(
        self,
        request: PrivacyRequest
    ) -> Dict[str, Any]:
        """
        Process a privacy request automatically.

        Args:
            request: Privacy request to process

        Returns:
            Processing result with data/status/notes
        """
        logger.info(f"Processing DSAR {request.id} (type={request.requestType}, jurisdiction={request.jurisdiction})")

        # Route to appropriate handler
        if request.requestType == PrivacyRequestType.ACCESS:
            return await self._handle_access(request)
        elif request.requestType == PrivacyRequestType.RECTIFICATION:
            return await self._handle_rectification(request)
        elif request.requestType == PrivacyRequestType.ERASURE:
            return await self._handle_erasure(request)
        elif request.requestType == PrivacyRequestType.PORTABILITY:
            return await self._handle_portability(request)
        elif request.requestType == PrivacyRequestType.WITHDRAW_CONSENT:
            return await self._handle_withdraw_consent(request)
        else:
            return {
                "status": "refused",
                "reason": f"Request type {request.requestType} not yet automated",
                "requires_manual_review": True
            }

    async def _handle_access(self, request: PrivacyRequest) -> Dict[str, Any]:
        """
        Handle access request (GDPR Art. 15, CCPA 1798.100, etc.).

        Provides:
        - Voter profile data (if exists)
        - Participation confirmation (which elections voted in, but NOT how)
        - Audit log entries (redacted - no vote content)
        - Clear explanation of vote anonymization
        """
        data = {
            "request_id": request.id,
            "generated_at": datetime.utcnow().isoformat(),
            "jurisdiction": request.jurisdiction,
            "data_categories": {}
        }

        # Find voter records
        voters = self.db.query(Voter).filter(
            Voter.voterHash == request.voterHash
        ).all()

        if voters:
            # Profile data
            profile_data = []
            for voter in voters:
                profile_data.append({
                    "election_id": voter.electionId,
                    "status": voter.status.value,
                    "verified_at": voter.verifiedAt.isoformat() if voter.verifiedAt else None,
                    "verification_method": voter.verificationMethod,
                    "channel": voter.channel.value,
                    "region": voter.region,
                    "district": voter.district,
                    "category": voter.category,
                    "created_at": voter.createdAt.isoformat(),
                })

            data["data_categories"]["voter_profiles"] = profile_data
            data["elections_participated"] = [v.electionId for v in voters]

            # Voting confirmation (WITHOUT vote content)
            voted_elections = [v.electionId for v in voters if v.status == "VOTED"]
            data["data_categories"]["voting_confirmation"] = {
                "elections_voted": voted_elections,
                "vote_anonymization_notice": (
                    "Your votes are cryptographically separated from your identity "
                    "using blind tokens and mix-net encryption. We cannot retrieve "
                    "how you voted - this is by design to ensure ballot secrecy. "
                    "Your vote commitments are anchored on the blockchain for "
                    "public verifiability, but they contain zero information about "
                    "your choices."
                )
            }

            # Audit logs (redacted)
            audit_logs = self.db.query(AuditLog).filter(
                and_(
                    AuditLog.resource == "voter",
                    or_(
                        *[AuditLog.resourceId == v.id for v in voters]
                    )
                )
            ).all()

            data["data_categories"]["audit_logs"] = [
                {
                    "action": log.action,
                    "resource": log.resource,
                    "timestamp": log.createdAt.isoformat(),
                    "ip_address": log.ipAddress,
                }
                for log in audit_logs
            ]

        else:
            data["notice"] = "No records found for the provided identifier."

        # Check for access codes
        access_codes = self.db.query(AccessCode).join(Voter).filter(
            Voter.voterHash == request.voterHash
        ).all()

        if access_codes:
            data["data_categories"]["access_codes"] = [
                {
                    "election_id": code.electionId,
                    "used_at": code.usedAt.isoformat() if code.usedAt else None,
                    "status": code.status.value,
                }
                for code in access_codes
            ]

        return {
            "status": "completed",
            "data": data,
            "format": "json",
            "notes": "Full access report generated. Vote content is anonymized and cannot be retrieved."
        }

    async def _handle_rectification(self, request: PrivacyRequest) -> Dict[str, Any]:
        """
        Handle rectification request (GDPR Art. 16, CPRA, etc.).

        Allows correction of profile data ONLY.
        Vote data cannot be rectified (integrity requirement).
        """
        # Check exceptions
        exceptions = rights_engine.check_exceptions(
            request.jurisdiction,
            DataSubjectRight.RECTIFICATION,
            "profile"
        )

        return {
            "status": "partially_completed",
            "notes": (
                "You can request corrections to your voter profile data "
                "(name, contact info, etc.). However, vote data cannot be "
                "modified after submission to preserve election integrity. "
                "If you need to change your vote, use the vote change feature "
                "during the designated period (if enabled for the election)."
            ),
            "requires_manual_review": True,  # Manual review needed for profile updates
            "rectifiable_data": ["voter_profile", "contact_info"],
            "non_rectifiable_data": ["votes", "ballots", "commitments"],
            "exceptions": exceptions
        }

    async def _handle_erasure(self, request: PrivacyRequest) -> Dict[str, Any]:
        """
        Handle erasure request (GDPR Art. 17, CCPA 1798.105, etc.).

        Critical balance:
        - CAN erase: Profile data (after election + challenge period)
        - CANNOT erase: Vote commitments (legal obligation, public interest)
        - Anonymized data: Already de-identified, no PII to erase

        Legal exceptions (GDPR Art. 17(3)):
        - Compliance with legal obligation
        - Archiving in public interest (Art. 89)
        - Establishment/defense of legal claims
        """
        voters = self.db.query(Voter).filter(
            Voter.voterHash == request.voterHash
        ).all()

        if not voters:
            return {
                "status": "completed",
                "notes": "No personal data found to erase.",
                "deleted_records": []
            }

        # Check if elections are still active or in challenge period
        from ..database.models import Election
        active_elections = []
        completed_elections = []

        for voter in voters:
            election = self.db.query(Election).filter(Election.id == voter.electionId).first()
            if election:
                # Check if election is closed and challenge period expired
                if election.status in ["ACTIVE", "PUBLISHED"]:
                    active_elections.append(election.id)
                else:
                    # Assume 90-day challenge period (configurable)
                    challenge_deadline = election.votingEndAt + timedelta(days=90)
                    if datetime.utcnow() < challenge_deadline:
                        active_elections.append(election.id)
                    else:
                        completed_elections.append(election.id)

        # Determine what can be deleted
        exceptions = rights_engine.check_exceptions(
            request.jurisdiction,
            DataSubjectRight.ERASURE,
            "vote"
        )

        if active_elections:
            return {
                "status": "refused",
                "reason": (
                    "Your personal data cannot be fully erased while elections are active "
                    "or within the legal challenge period (90 days after election close). "
                    "Your vote data is already anonymized and cannot be linked to you. "
                    "After the challenge period expires, your profile data will be "
                    "automatically anonymized as per our retention policy."
                ),
                "exceptions": [
                    "legal_obligation",
                    "public_interest_archiving",
                    "establishment_of_legal_claims"
                ],
                "active_elections": active_elections,
                "automatic_deletion_date": "90 days after election close",
            }

        # Can delete profile data for completed elections
        deleted_records = []
        for voter in voters:
            if voter.electionId in completed_elections:
                # Anonymize instead of delete (preserve participation count)
                voter.voterHash = hashlib.sha256(
                    (voter.id + "_ANONYMIZED_" + secrets.token_hex(16)).encode()
                ).hexdigest()
                voter.verificationMethod = None
                voter.diditSessionId = None
                voter.ipAddress = None
                voter.deviceFingerprint = None
                voter.geoLocation = None
                deleted_records.append({
                    "election_id": voter.electionId,
                    "action": "anonymized"
                })

        self.db.commit()

        return {
            "status": "completed",
            "notes": (
                "Your personal data has been anonymized for completed elections. "
                "Vote commitments remain on the blockchain for public verifiability "
                "but contain no personally identifiable information."
            ),
            "deleted_records": deleted_records,
            "preserved_data": "Anonymized vote commitments (legal obligation)",
            "exceptions": exceptions
        }

    async def _handle_portability(self, request: PrivacyRequest) -> Dict[str, Any]:
        """
        Handle portability request (GDPR Art. 20, CPRA, etc.).

        Provides machine-readable export of all personal data.
        """
        # Use access handler to get data, then format for portability
        access_result = await self._handle_access(request)

        if access_result["status"] == "completed":
            return {
                "status": "completed",
                "data": access_result["data"],
                "format": "json",  # Can also offer CSV, XML
                "notes": "Your data is provided in JSON format for portability.",
                "alternative_formats": ["csv", "xml"]
            }

        return access_result

    async def _handle_withdraw_consent(self, request: PrivacyRequest) -> Dict[str, Any]:
        """
        Handle consent withdrawal (GDPR Art. 7(3), PIPL, etc.).

        Note: For election participation, withdrawal must happen BEFORE voting.
        After voting, anonymization makes withdrawal moot.
        """
        from .models import ConsentRecord

        consents = self.db.query(ConsentRecord).filter(
            ConsentRecord.voterHash == request.voterHash,
            ConsentRecord.granted == True,
            ConsentRecord.withdrawnAt.is_(None)
        ).all()

        if not consents:
            return {
                "status": "completed",
                "notes": "No active consents found to withdraw."
            }

        withdrawn = []
        for consent in consents:
            consent.granted = False
            consent.withdrawnAt = datetime.utcnow()
            withdrawn.append({
                "purpose": consent.purpose,
                "withdrawn_at": datetime.utcnow().isoformat()
            })

        self.db.commit()

        return {
            "status": "completed",
            "withdrawn_consents": withdrawn,
            "notes": (
                "Consent withdrawn. Note: If you have already voted, your vote "
                "remains valid but is fully anonymized. Consent withdrawal does "
                "not invalidate already-cast votes."
            )
        }

    def generate_download_token(self, request: PrivacyRequest) -> str:
        """
        Generate secure download token for data export.

        Returns:
            Download token
        """
        token = secrets.token_urlsafe(32)
        request.downloadToken = hashlib.sha256(token.encode()).hexdigest()
        request.downloadExpiresAt = datetime.utcnow() + timedelta(days=7)
        self.db.commit()
        return token

    def verify_download_token(self, request_id: str, token: str) -> Optional[PrivacyRequest]:
        """
        Verify download token and return request if valid.

        Args:
            request_id: Request ID
            token: Download token

        Returns:
            Privacy request if valid, None otherwise
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        request = self.db.query(PrivacyRequest).filter(
            and_(
                PrivacyRequest.id == request_id,
                PrivacyRequest.downloadToken == token_hash,
                PrivacyRequest.downloadExpiresAt > datetime.utcnow()
            )
        ).first()

        return request
