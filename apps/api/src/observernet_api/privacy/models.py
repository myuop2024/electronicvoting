"""
Privacy Database Models

Models for Data Subject Access Requests (DSAR), breach notifications,
and consent tracking.
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON

from ..database.models import Base
from .jurisdiction import PrivacyJurisdiction
from .rights_engine import DataSubjectRight


class PrivacyRequestType(str, enum.Enum):
    """Types of privacy requests."""
    ACCESS = "ACCESS"  # Data access request
    RECTIFICATION = "RECTIFICATION"  # Data correction
    ERASURE = "ERASURE"  # Data deletion
    PORTABILITY = "PORTABILITY"  # Data export
    OBJECTION = "OBJECTION"  # Object to processing
    RESTRICTION = "RESTRICTION"  # Restrict processing
    WITHDRAW_CONSENT = "WITHDRAW_CONSENT"  # Withdraw consent
    OPT_OUT_SALE = "OPT_OUT_SALE"  # Opt-out of sale
    OPT_OUT_PROFILING = "OPT_OUT_PROFILING"  # Opt-out of profiling


class PrivacyRequestStatus(str, enum.Enum):
    """Status of privacy requests."""
    SUBMITTED = "SUBMITTED"  # Just submitted, pending verification
    VERIFYING = "VERIFYING"  # Identity verification in progress
    VERIFIED = "VERIFIED"  # Identity verified, ready for processing
    PROCESSING = "PROCESSING"  # Being fulfilled
    COMPLETED = "COMPLETED"  # Successfully completed
    REFUSED = "REFUSED"  # Refused (with legal justification)
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"  # Partial fulfillment (some exceptions apply)
    EXPIRED = "EXPIRED"  # Expired (no verification within deadline)


class PrivacyRequest(Base):
    """
    Privacy Request / DSAR model.

    Tracks data subject access requests across all jurisdictions.
    """
    __tablename__ = "PrivacyRequest"

    id = Column(String, primary_key=True)

    # Subject identification (email for verification)
    email = Column(String, nullable=False)
    emailVerified = Column(Boolean, default=False)
    emailVerificationToken = Column(String, nullable=True)
    emailVerifiedAt = Column(DateTime, nullable=True)

    # Additional verification (MFA code, etc.)
    verificationCode = Column(String, nullable=True)
    verificationCodeSentAt = Column(DateTime, nullable=True)
    verificationAttempts = Column(Integer, default=0)

    # Request details
    requestType = Column(Enum(PrivacyRequestType), nullable=False)
    jurisdiction = Column(Enum(PrivacyJurisdiction), nullable=False)
    status = Column(Enum(PrivacyRequestStatus), default=PrivacyRequestStatus.SUBMITTED)

    # Linked records
    voterHash = Column(String, nullable=True)  # Hash to identify voter records
    electionIds = Column(JSON, default=[])  # Elections user participated in

    # Request metadata
    description = Column(Text, nullable=True)  # User's description
    ipAddress = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    countryCode = Column(String, nullable=True)

    # Processing
    assignedTo = Column(String, nullable=True)  # Admin user ID
    processingStartedAt = Column(DateTime, nullable=True)
    dueAt = Column(DateTime, nullable=False)  # Legal deadline
    completedAt = Column(DateTime, nullable=True)

    # Fulfillment
    responseData = Column(JSON, nullable=True)  # Exported data for access/portability
    responseNotes = Column(Text, nullable=True)  # Admin notes
    refusalReason = Column(Text, nullable=True)  # Legal justification for refusal
    exceptions = Column(JSON, default=[])  # Applicable exceptions

    # Delivery
    deliveryMethod = Column(String, nullable=True)  # email, secure_download
    downloadToken = Column(String, nullable=True)  # Token for secure download
    downloadExpiresAt = Column(DateTime, nullable=True)
    downloadedAt = Column(DateTime, nullable=True)

    # Audit
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("PrivacyRequest_email_idx", "email"),
        Index("PrivacyRequest_status_idx", "status"),
        Index("PrivacyRequest_dueAt_idx", "dueAt"),
        Index("PrivacyRequest_voterHash_idx", "voterHash"),
    )


class BreachSeverity(str, enum.Enum):
    """Severity of data breach."""
    LOW = "LOW"  # Minimal risk to data subjects
    MEDIUM = "MEDIUM"  # Some risk to data subjects
    HIGH = "HIGH"  # Significant risk to data subjects
    CRITICAL = "CRITICAL"  # Severe risk (e.g., vote exposure, identity theft)


class BreachStatus(str, enum.Enum):
    """Status of breach notification."""
    DETECTED = "DETECTED"  # Breach detected
    INVESTIGATING = "INVESTIGATING"  # Under investigation
    CONFIRMED = "CONFIRMED"  # Confirmed as breach
    NOTIFYING_AUTHORITIES = "NOTIFYING_AUTHORITIES"  # Notifying regulators
    NOTIFYING_SUBJECTS = "NOTIFYING_SUBJECTS"  # Notifying affected users
    MITIGATED = "MITIGATED"  # Breach mitigated
    CLOSED = "CLOSED"  # Incident closed


class BreachNotification(Base):
    """
    Data Breach Notification tracking.

    Implements breach notification requirements across jurisdictions:
    - GDPR: 72 hours to regulator, prompt to subjects
    - CCPA/CPRA: Prompt notification
    - LGPD: Immediate to authority and subjects
    """
    __tablename__ = "BreachNotification"

    id = Column(String, primary_key=True)

    # Breach details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(BreachSeverity), nullable=False)
    status = Column(Enum(BreachStatus), default=BreachStatus.DETECTED)

    # Scope
    affectedDataTypes = Column(JSON, default=[])  # Types of data exposed
    affectedRecordsCount = Column(Integer, default=0)
    affectedUserEmails = Column(JSON, default=[])  # Affected user emails
    affectedJurisdictions = Column(JSON, default=[])  # Jurisdictions to notify

    # Timeline
    detectedAt = Column(DateTime, nullable=False)
    confirmedAt = Column(DateTime, nullable=True)
    containedAt = Column(DateTime, nullable=True)

    # Root cause
    causeCategory = Column(String, nullable=True)  # e.g., "unauthorized_access", "misconfiguration"
    rootCause = Column(Text, nullable=True)
    technicalDetails = Column(Text, nullable=True)

    # Notifications
    authoritiesNotifiedAt = Column(DateTime, nullable=True)
    authoritiesNotificationDetails = Column(JSON, default={})  # Which authorities, confirmation #s

    subjectsNotifiedAt = Column(DateTime, nullable=True)
    subjectsNotificationMethod = Column(String, nullable=True)  # email, website, etc.

    # Mitigation
    mitigationSteps = Column(JSON, default=[])
    preventiveMeasures = Column(JSON, default=[])
    mitigatedAt = Column(DateTime, nullable=True)

    # Responsible party
    detectedBy = Column(String, nullable=True)  # User ID or system
    investigatedBy = Column(String, nullable=True)  # Admin user ID
    responsibleParty = Column(String, nullable=True)

    # Audit
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closedAt = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("BreachNotification_severity_idx", "severity"),
        Index("BreachNotification_status_idx", "status"),
        Index("BreachNotification_detectedAt_idx", "detectedAt"),
    )


class ConsentRecord(Base):
    """
    Consent tracking for privacy compliance.

    Tracks explicit consent for data processing, especially important
    for PIPL (China) and other consent-based regimes.
    """
    __tablename__ = "ConsentRecord"

    id = Column(String, primary_key=True)

    # Subject
    voterHash = Column(String, nullable=False)
    electionId = Column(String, nullable=True)

    # Consent details
    purpose = Column(String, nullable=False)  # Purpose of processing
    consentText = Column(Text, nullable=False)  # What user agreed to
    consentVersion = Column(String, nullable=False)  # Version of consent text

    # Consent state
    granted = Column(Boolean, default=True)
    grantedAt = Column(DateTime, nullable=False)
    withdrawnAt = Column(DateTime, nullable=True)

    # Context
    jurisdiction = Column(Enum(PrivacyJurisdiction), nullable=True)
    ipAddress = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)

    # Proof
    proof = Column(JSON, default={})  # Proof of consent (checkbox state, signature, etc.)

    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ConsentRecord_voterHash_idx", "voterHash"),
        Index("ConsentRecord_electionId_idx", "electionId"),
        Index("ConsentRecord_purpose_idx", "purpose"),
    )


class DataRetentionPolicy(Base):
    """
    Data Retention Policy tracking.

    Defines retention periods for different data types and automates cleanup.
    """
    __tablename__ = "DataRetentionPolicy"

    id = Column(String, primary_key=True)

    # Policy details
    dataType = Column(String, nullable=False)  # e.g., "voter_profile", "ballot_commitment"
    retentionPeriodDays = Column(Integer, nullable=False)
    deletionMethod = Column(String, nullable=False)  # "anonymize", "delete", "archive"

    # Scope
    jurisdiction = Column(Enum(PrivacyJurisdiction), nullable=True)
    electionType = Column(String, nullable=True)

    # Legal basis
    legalBasis = Column(Text, nullable=True)
    regulatoryReference = Column(String, nullable=True)

    # Status
    active = Column(Boolean, default=True)
    lastEnforced = Column(DateTime, nullable=True)
    nextEnforcement = Column(DateTime, nullable=True)

    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("DataRetentionPolicy_dataType_idx", "dataType"),
        Index("DataRetentionPolicy_active_idx", "active"),
    )
