"""
Data Retention and Cleanup Automation

Automates post-election data anonymization and cleanup per privacy regulations.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import hashlib
import secrets

from sqlalchemy.orm import Session
from sqlalchemy import and_

from .models import DataRetentionPolicy
from .jurisdiction import PrivacyJurisdiction
from ..database.models import Election, Voter, VoteToken, AccessCode, AuditLog

logger = logging.getLogger(__name__)


class RetentionEngine:
    """
    Automated data retention and cleanup engine.

    Implements privacy-by-design with automatic data minimization:
    - Profile data: Anonymized after election + challenge period
    - Vote commitments: Retained indefinitely (legal obligation)
    - Audit logs: Retained per legal requirements
    """

    # Default retention periods (days)
    DEFAULT_RETENTION = {
        "voter_profile": 90,  # After election close
        "access_code": 90,
        "vote_token": 90,
        "audit_log_operational": 365,  # 1 year for operational logs
        "audit_log_legal": 2555,  # 7 years for legal/compliance logs
        "ballot_commitment": None,  # Retained indefinitely
    }

    def __init__(self, db: Session):
        """Initialize retention engine."""
        self.db = db

    def enforce_retention_policies(self) -> Dict[str, Any]:
        """
        Enforce all active retention policies.

        Should be run as a scheduled job (e.g., daily cron).

        Returns:
            Summary of enforcement actions
        """
        logger.info("Starting retention policy enforcement")

        results = {
            "started_at": datetime.utcnow().isoformat(),
            "policies_enforced": 0,
            "records_anonymized": 0,
            "records_deleted": 0,
            "elections_processed": 0,
            "errors": [],
        }

        try:
            # Get all active retention policies
            policies = self.db.query(DataRetentionPolicy).filter(
                DataRetentionPolicy.active == True
            ).all()

            if not policies:
                logger.info("No active retention policies, using defaults")
                # Use default policies
                results.update(self._enforce_default_policies())
            else:
                # Enforce custom policies
                for policy in policies:
                    try:
                        result = self._enforce_policy(policy)
                        results["policies_enforced"] += 1
                        results["records_anonymized"] += result.get("anonymized", 0)
                        results["records_deleted"] += result.get("deleted", 0)

                        # Update policy
                        policy.lastEnforced = datetime.utcnow()
                        self.db.commit()

                    except Exception as e:
                        logger.error(f"Error enforcing policy {policy.id}: {e}")
                        results["errors"].append({
                            "policy_id": policy.id,
                            "error": str(e)
                        })

        except Exception as e:
            logger.error(f"Error in retention enforcement: {e}")
            results["errors"].append({"general": str(e)})

        results["completed_at"] = datetime.utcnow().isoformat()
        logger.info(f"Retention enforcement completed: {results}")

        return results

    def _enforce_default_policies(self) -> Dict[str, Any]:
        """
        Enforce default retention policies.

        Returns:
            Enforcement summary
        """
        results = {
            "anonymized": 0,
            "deleted": 0,
        }

        # Find elections past challenge period
        challenge_period_days = self.DEFAULT_RETENTION["voter_profile"]
        cutoff_date = datetime.utcnow() - timedelta(days=challenge_period_days)

        elections = self.db.query(Election).filter(
            and_(
                Election.status == "CLOSED",
                Election.votingEndAt < cutoff_date
            )
        ).all()

        logger.info(f"Found {len(elections)} elections past retention period")

        for election in elections:
            try:
                result = self._anonymize_election_data(election.id)
                results["anonymized"] += result["anonymized"]
                results["deleted"] += result["deleted"]
            except Exception as e:
                logger.error(f"Error anonymizing election {election.id}: {e}")

        return results

    def _enforce_policy(self, policy: DataRetentionPolicy) -> Dict[str, Any]:
        """
        Enforce a specific retention policy.

        Args:
            policy: Retention policy to enforce

        Returns:
            Enforcement summary
        """
        logger.info(f"Enforcing policy {policy.id} for {policy.dataType}")

        cutoff_date = datetime.utcnow() - timedelta(days=policy.retentionPeriodDays)

        if policy.dataType == "voter_profile":
            return self._cleanup_voter_profiles(cutoff_date, policy.deletionMethod)
        elif policy.dataType == "access_code":
            return self._cleanup_access_codes(cutoff_date, policy.deletionMethod)
        elif policy.dataType == "vote_token":
            return self._cleanup_vote_tokens(cutoff_date, policy.deletionMethod)
        else:
            logger.warning(f"Unknown data type: {policy.dataType}")
            return {"anonymized": 0, "deleted": 0}

    def _anonymize_election_data(self, election_id: str) -> Dict[str, Any]:
        """
        Anonymize all personal data for an election past retention period.

        Args:
            election_id: Election ID

        Returns:
            Anonymization summary
        """
        logger.info(f"Anonymizing data for election {election_id}")

        result = {
            "anonymized": 0,
            "deleted": 0,
        }

        # Anonymize voter profiles
        voters = self.db.query(Voter).filter(
            Voter.electionId == election_id
        ).all()

        for voter in voters:
            # Generate anonymous hash
            voter.voterHash = hashlib.sha256(
                (voter.id + "_ANONYMIZED_" + secrets.token_hex(16)).encode()
            ).hexdigest()

            # Clear PII
            voter.verificationMethod = None
            voter.diditSessionId = None
            voter.ipAddress = None
            voter.deviceFingerprint = None
            voter.geoLocation = None

            result["anonymized"] += 1

        # Delete access codes
        access_codes = self.db.query(AccessCode).filter(
            AccessCode.electionId == election_id
        ).all()

        for code in access_codes:
            self.db.delete(code)
            result["deleted"] += 1

        # Anonymize vote tokens (keep for audit but remove linkability)
        vote_tokens = self.db.query(VoteToken).filter(
            VoteToken.electionId == election_id
        ).all()

        for token in vote_tokens:
            # Keep token but break voter link
            token.voterId = f"ANONYMIZED_{secrets.token_hex(8)}"
            result["anonymized"] += 1

        self.db.commit()

        logger.info(f"Anonymized {result['anonymized']} records, deleted {result['deleted']} for election {election_id}")

        return result

    def _cleanup_voter_profiles(self, cutoff_date: datetime, method: str) -> Dict[str, Any]:
        """Clean up voter profiles older than cutoff date."""
        result = {"anonymized": 0, "deleted": 0}

        # Find voters from closed elections older than cutoff
        voters = self.db.query(Voter).join(Election).filter(
            and_(
                Election.status == "CLOSED",
                Election.votingEndAt < cutoff_date
            )
        ).all()

        for voter in voters:
            if method == "anonymize":
                voter.voterHash = hashlib.sha256(
                    (voter.id + "_ANONYMIZED_" + secrets.token_hex(16)).encode()
                ).hexdigest()
                voter.ipAddress = None
                voter.deviceFingerprint = None
                voter.geoLocation = None
                result["anonymized"] += 1
            elif method == "delete":
                self.db.delete(voter)
                result["deleted"] += 1

        self.db.commit()
        return result

    def _cleanup_access_codes(self, cutoff_date: datetime, method: str) -> Dict[str, Any]:
        """Clean up access codes older than cutoff date."""
        result = {"anonymized": 0, "deleted": 0}

        codes = self.db.query(AccessCode).join(Election).filter(
            and_(
                Election.status == "CLOSED",
                Election.votingEndAt < cutoff_date
            )
        ).all()

        for code in codes:
            if method in ["delete", "anonymize"]:
                self.db.delete(code)
                result["deleted"] += 1

        self.db.commit()
        return result

    def _cleanup_vote_tokens(self, cutoff_date: datetime, method: str) -> Dict[str, Any]:
        """Clean up vote tokens older than cutoff date."""
        result = {"anonymized": 0, "deleted": 0}

        tokens = self.db.query(VoteToken).join(Election).filter(
            and_(
                Election.status == "CLOSED",
                Election.votingEndAt < cutoff_date
            )
        ).all()

        for token in tokens:
            if method == "anonymize":
                token.voterId = f"ANONYMIZED_{secrets.token_hex(8)}"
                result["anonymized"] += 1
            elif method == "delete":
                # Don't delete tokens - they're needed for audit trail
                # Just anonymize instead
                token.voterId = f"ANONYMIZED_{secrets.token_hex(8)}"
                result["anonymized"] += 1

        self.db.commit()
        return result

    def create_retention_policy(
        self,
        data_type: str,
        retention_days: int,
        deletion_method: str,
        jurisdiction: Optional[PrivacyJurisdiction] = None,
    ) -> DataRetentionPolicy:
        """
        Create a new retention policy.

        Args:
            data_type: Type of data
            retention_days: Days to retain
            deletion_method: "anonymize", "delete", or "archive"
            jurisdiction: Optional jurisdiction

        Returns:
            Created policy
        """
        policy = DataRetentionPolicy(
            id=f"POLICY_{secrets.token_hex(8)}",
            dataType=data_type,
            retentionPeriodDays=retention_days,
            deletionMethod=deletion_method,
            jurisdiction=jurisdiction,
            active=True,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow(),
        )

        self.db.add(policy)
        self.db.commit()

        logger.info(f"Created retention policy {policy.id} for {data_type}")

        return policy
