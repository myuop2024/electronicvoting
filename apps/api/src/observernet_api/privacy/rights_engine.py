"""
Privacy Rights Engine

Maps data subject rights across jurisdictions and determines applicable rights
based on the user's jurisdiction and the nature of the data.
"""

import enum
from typing import List, Dict, Optional, Set
from datetime import timedelta
from dataclasses import dataclass

from .jurisdiction import PrivacyJurisdiction


class DataSubjectRight(str, enum.Enum):
    """Data subject rights across privacy laws."""
    ACCESS = "ACCESS"  # Right to access personal data
    RECTIFICATION = "RECTIFICATION"  # Right to correct inaccurate data
    ERASURE = "ERASURE"  # Right to be forgotten / deletion
    PORTABILITY = "PORTABILITY"  # Right to data portability
    OBJECTION = "OBJECTION"  # Right to object to processing
    RESTRICTION = "RESTRICTION"  # Right to restrict processing
    WITHDRAW_CONSENT = "WITHDRAW_CONSENT"  # Right to withdraw consent
    OPT_OUT_SALE = "OPT_OUT_SALE"  # Right to opt-out of sale (CCPA/CPRA)
    OPT_OUT_PROFILING = "OPT_OUT_PROFILING"  # Right to opt-out of profiling
    HUMAN_REVIEW = "HUMAN_REVIEW"  # Right to human review of automated decisions
    KNOW_SHARING = "KNOW_SHARING"  # Right to know what data is shared


@dataclass
class RightConfiguration:
    """Configuration for a specific data subject right in a jurisdiction."""
    right: DataSubjectRight
    response_deadline: timedelta  # How quickly we must respond
    available: bool = True  # Is this right available?
    requires_verification: bool = True  # Does it require identity verification?
    exceptions: List[str] = None  # Legal exceptions that may apply

    def __post_init__(self):
        if self.exceptions is None:
            self.exceptions = []


class PrivacyRightsEngine:
    """
    Engine to determine applicable privacy rights based on jurisdiction.

    Implements rights mappings for all major privacy laws with proper
    timelines and legal exceptions.
    """

    # Rights configuration per jurisdiction
    JURISDICTION_RIGHTS: Dict[PrivacyJurisdiction, List[RightConfiguration]] = {
        PrivacyJurisdiction.GDPR: [
            RightConfiguration(
                DataSubjectRight.ACCESS,
                timedelta(days=30),
                exceptions=["manifestly_unfounded", "excessive_requests"]
            ),
            RightConfiguration(
                DataSubjectRight.RECTIFICATION,
                timedelta(days=30),
                exceptions=["accuracy_disputed"]
            ),
            RightConfiguration(
                DataSubjectRight.ERASURE,
                timedelta(days=30),
                exceptions=[
                    "legal_obligation",
                    "public_interest_archiving",  # GDPR Art. 89 - election records
                    "establishment_of_legal_claims",
                ]
            ),
            RightConfiguration(
                DataSubjectRight.PORTABILITY,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.OBJECTION,
                timedelta(days=30),
                exceptions=["compelling_legitimate_grounds"]
            ),
            RightConfiguration(
                DataSubjectRight.RESTRICTION,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.WITHDRAW_CONSENT,
                timedelta(days=1),  # Immediate
            ),
            RightConfiguration(
                DataSubjectRight.HUMAN_REVIEW,
                timedelta(days=30),
            ),
        ],

        PrivacyJurisdiction.CCPA: [
            RightConfiguration(
                DataSubjectRight.ACCESS,
                timedelta(days=45),
                exceptions=["verification_failure"]
            ),
            RightConfiguration(
                DataSubjectRight.ERASURE,
                timedelta(days=45),
                exceptions=["legal_obligation", "transaction_completion"]
            ),
            RightConfiguration(
                DataSubjectRight.OPT_OUT_SALE,
                timedelta(days=15),
            ),
            RightConfiguration(
                DataSubjectRight.KNOW_SHARING,
                timedelta(days=45),
            ),
        ],

        PrivacyJurisdiction.CPRA: [
            # CPRA includes all CCPA rights plus additional ones
            RightConfiguration(
                DataSubjectRight.ACCESS,
                timedelta(days=45),
                exceptions=["verification_failure"]
            ),
            RightConfiguration(
                DataSubjectRight.RECTIFICATION,
                timedelta(days=45),
            ),
            RightConfiguration(
                DataSubjectRight.ERASURE,
                timedelta(days=45),
                exceptions=["legal_obligation", "transaction_completion"]
            ),
            RightConfiguration(
                DataSubjectRight.PORTABILITY,
                timedelta(days=45),
            ),
            RightConfiguration(
                DataSubjectRight.OPT_OUT_SALE,
                timedelta(days=15),
            ),
            RightConfiguration(
                DataSubjectRight.OPT_OUT_PROFILING,
                timedelta(days=15),
            ),
            RightConfiguration(
                DataSubjectRight.KNOW_SHARING,
                timedelta(days=45),
            ),
        ],

        PrivacyJurisdiction.LGPD: [
            RightConfiguration(
                DataSubjectRight.ACCESS,
                timedelta(days=15),  # LGPD has shorter timelines
            ),
            RightConfiguration(
                DataSubjectRight.RECTIFICATION,
                timedelta(days=15),
            ),
            RightConfiguration(
                DataSubjectRight.ERASURE,
                timedelta(days=15),
                exceptions=["legal_obligation", "public_interest"]
            ),
            RightConfiguration(
                DataSubjectRight.PORTABILITY,
                timedelta(days=15),
            ),
            RightConfiguration(
                DataSubjectRight.OBJECTION,
                timedelta(days=15),
            ),
            RightConfiguration(
                DataSubjectRight.WITHDRAW_CONSENT,
                timedelta(days=1),
            ),
        ],

        PrivacyJurisdiction.PIPL: [
            # PIPL (China) - strict consent requirements
            RightConfiguration(
                DataSubjectRight.ACCESS,
                timedelta(days=30),
                requires_verification=True,
            ),
            RightConfiguration(
                DataSubjectRight.RECTIFICATION,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.ERASURE,
                timedelta(days=30),
                exceptions=["legal_obligation", "state_archiving"]
            ),
            RightConfiguration(
                DataSubjectRight.PORTABILITY,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.WITHDRAW_CONSENT,
                timedelta(days=1),
            ),
        ],

        PrivacyJurisdiction.DPDP: [
            # DPDP Act (India)
            RightConfiguration(
                DataSubjectRight.ACCESS,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.RECTIFICATION,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.ERASURE,
                timedelta(days=30),
                exceptions=["legal_obligation", "compliance_obligation"]
            ),
            RightConfiguration(
                DataSubjectRight.WITHDRAW_CONSENT,
                timedelta(days=1),
            ),
        ],

        PrivacyJurisdiction.GENERAL: [
            # Fallback for jurisdictions without specific laws - provide reasonable rights
            RightConfiguration(
                DataSubjectRight.ACCESS,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.RECTIFICATION,
                timedelta(days=30),
            ),
            RightConfiguration(
                DataSubjectRight.ERASURE,
                timedelta(days=30),
                exceptions=["legal_obligation"]
            ),
        ],
    }

    def __init__(self):
        """Initialize privacy rights engine."""
        pass

    def get_available_rights(
        self,
        jurisdiction: PrivacyJurisdiction
    ) -> List[RightConfiguration]:
        """
        Get all available rights for a jurisdiction.

        Args:
            jurisdiction: Privacy jurisdiction

        Returns:
            List of right configurations
        """
        return self.JURISDICTION_RIGHTS.get(
            jurisdiction,
            self.JURISDICTION_RIGHTS[PrivacyJurisdiction.GENERAL]
        )

    def get_right_config(
        self,
        jurisdiction: PrivacyJurisdiction,
        right: DataSubjectRight
    ) -> Optional[RightConfiguration]:
        """
        Get configuration for a specific right in a jurisdiction.

        Args:
            jurisdiction: Privacy jurisdiction
            right: Data subject right

        Returns:
            Right configuration or None if not available
        """
        rights = self.get_available_rights(jurisdiction)
        for config in rights:
            if config.right == right:
                return config
        return None

    def is_right_available(
        self,
        jurisdiction: PrivacyJurisdiction,
        right: DataSubjectRight
    ) -> bool:
        """
        Check if a right is available in a jurisdiction.

        Args:
            jurisdiction: Privacy jurisdiction
            right: Data subject right

        Returns:
            True if available
        """
        config = self.get_right_config(jurisdiction, right)
        return config is not None and config.available

    def get_response_deadline(
        self,
        jurisdiction: PrivacyJurisdiction,
        right: DataSubjectRight
    ) -> Optional[timedelta]:
        """
        Get response deadline for a right in a jurisdiction.

        Args:
            jurisdiction: Privacy jurisdiction
            right: Data subject right

        Returns:
            Response deadline or None
        """
        config = self.get_right_config(jurisdiction, right)
        return config.response_deadline if config else None

    def check_exceptions(
        self,
        jurisdiction: PrivacyJurisdiction,
        right: DataSubjectRight,
        data_type: str
    ) -> List[str]:
        """
        Check if any legal exceptions apply to a right request.

        For ObserverNet, key exceptions:
        - Vote data: Cannot be erased (anonymized, legal obligation, public interest)
        - Audit logs: Cannot be modified (legal obligation, establishment of claims)
        - Profile data: Can be erased after election + challenge period

        Args:
            jurisdiction: Privacy jurisdiction
            right: Data subject right
            data_type: Type of data (e.g., 'vote', 'profile', 'audit')

        Returns:
            List of applicable exceptions
        """
        config = self.get_right_config(jurisdiction, right)
        if not config:
            return []

        applicable_exceptions = []

        # Vote data special handling
        if data_type == "vote":
            if right == DataSubjectRight.ERASURE:
                applicable_exceptions.append("public_interest_archiving")
                applicable_exceptions.append("legal_obligation")
            if right == DataSubjectRight.RECTIFICATION:
                applicable_exceptions.append("election_integrity")

        # Audit log protection
        if data_type == "audit":
            if right in [DataSubjectRight.ERASURE, DataSubjectRight.RECTIFICATION]:
                applicable_exceptions.append("legal_obligation")
                applicable_exceptions.append("establishment_of_legal_claims")

        return applicable_exceptions

    def get_strictest_deadline(
        self,
        jurisdictions: List[PrivacyJurisdiction],
        right: DataSubjectRight
    ) -> Optional[timedelta]:
        """
        Get the strictest (shortest) deadline across multiple jurisdictions.

        Useful when a user may be covered by multiple laws.

        Args:
            jurisdictions: List of jurisdictions
            right: Data subject right

        Returns:
            Strictest deadline or None
        """
        deadlines = []
        for jurisdiction in jurisdictions:
            deadline = self.get_response_deadline(jurisdiction, right)
            if deadline:
                deadlines.append(deadline)

        return min(deadlines) if deadlines else None


# Global instance
rights_engine = PrivacyRightsEngine()
