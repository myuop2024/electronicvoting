"""
Privacy and Data Protection Compliance Module

Implements GDPR, CCPA/CPRA, LGPD, PIPL, PDPA, DPDP Act India compliance
with automated Data Subject Access Request (DSAR) fulfillment.
"""

from .jurisdiction import JurisdictionDetector, PrivacyJurisdiction
from .rights_engine import PrivacyRightsEngine, DataSubjectRight
from .models import (
    PrivacyRequest,
    PrivacyRequestType,
    PrivacyRequestStatus,
    BreachNotification,
)

__all__ = [
    "JurisdictionDetector",
    "PrivacyJurisdiction",
    "PrivacyRightsEngine",
    "DataSubjectRight",
    "PrivacyRequest",
    "PrivacyRequestType",
    "PrivacyRequestStatus",
    "BreachNotification",
]
