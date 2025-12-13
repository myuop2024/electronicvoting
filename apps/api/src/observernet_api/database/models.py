"""
SQLAlchemy models for ObserverNet Election API.
These mirror the Prisma schema for compatibility.
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


# ============================================================================
# ENUMS
# ============================================================================

class VoterStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    VOTED = "VOTED"
    REJECTED = "REJECTED"
    BLOCKED = "BLOCKED"


class VoteChannel(str, enum.Enum):
    WEB = "WEB"
    WHATSAPP = "WHATSAPP"
    API = "API"
    OFFLINE = "OFFLINE"
    PAPER = "PAPER"


class VoteTokenStatus(str, enum.Enum):
    ISSUED = "ISSUED"
    USED = "USED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class BallotStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    TALLIED = "TALLIED"
    SUPERSEDED = "SUPERSEDED"
    REJECTED = "REJECTED"


class ElectionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


# ============================================================================
# MODELS
# ============================================================================

class Election(Base):
    """Election model - mirrors Prisma schema."""
    __tablename__ = "Election"

    id = Column(String, primary_key=True)
    orgId = Column(String, nullable=False)
    createdById = Column(String, nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    votingStartAt = Column(DateTime, nullable=False)
    votingEndAt = Column(DateTime, nullable=False)

    allowVoteChange = Column(Boolean, default=False)
    voteChangeDeadline = Column(DateTime, nullable=True)

    status = Column(Enum(ElectionStatus), default=ElectionStatus.DRAFT)
    settings = Column(JSON, default={})

    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    voters = relationship("Voter", back_populates="election")
    voteTokens = relationship("VoteToken", back_populates="election")
    ballots = relationship("Ballot", back_populates="election")
    contests = relationship("Contest", back_populates="election")

    __table_args__ = (
        UniqueConstraint("orgId", "slug", name="Election_orgId_slug_key"),
        Index("Election_orgId_idx", "orgId"),
        Index("Election_status_idx", "status"),
    )


class Voter(Base):
    """Voter model - tracks voter verification status WITHOUT linking to ballot."""
    __tablename__ = "Voter"

    id = Column(String, primary_key=True)
    electionId = Column(String, ForeignKey("Election.id", ondelete="CASCADE"), nullable=False)
    voterHash = Column(String, nullable=False)  # Hash of voter PII

    verificationMethod = Column(String, nullable=True)
    verifiedAt = Column(DateTime, nullable=True)
    diditSessionId = Column(String, nullable=True)

    channel = Column(Enum(VoteChannel), default=VoteChannel.WEB)
    deviceFingerprint = Column(String, nullable=True)
    ipAddress = Column(String, nullable=True)
    geoLocation = Column(JSON, nullable=True)

    # CRITICAL: Status tracks if voted, but NO ballot reference
    status = Column(Enum(VoterStatus), default=VoterStatus.PENDING)

    region = Column(String, nullable=True)
    district = Column(String, nullable=True)
    category = Column(String, nullable=True)
    weight = Column(Integer, nullable=True)

    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships - Note: NO ballot relationship for anonymity
    election = relationship("Election", back_populates="voters")
    voteTokens = relationship("VoteToken", back_populates="voter")

    __table_args__ = (
        UniqueConstraint("electionId", "voterHash", name="Voter_electionId_voterHash_key"),
        Index("Voter_electionId_idx", "electionId"),
        Index("Voter_status_idx", "status"),
    )


class VoteToken(Base):
    """
    Vote Token model - implements cryptographic unlinkability.

    This is the key to vote anonymity:
    1. Voter verifies identity -> receives token
    2. Voter uses token to submit ballot
    3. Ballot stores tokenHash, not voterId
    4. No way to link ballot back to voter even with DB access
    """
    __tablename__ = "VoteToken"

    id = Column(String, primary_key=True)
    electionId = Column(String, ForeignKey("Election.id", ondelete="CASCADE"), nullable=False)
    voterId = Column(String, ForeignKey("Voter.id", ondelete="CASCADE"), nullable=False)

    # Token hash - voter holds raw token, we store hash
    tokenHash = Column(String, unique=True, nullable=False)

    # Optional blind signature for advanced cryptographic verification
    blindSignature = Column(Text, nullable=True)

    status = Column(Enum(VoteTokenStatus), default=VoteTokenStatus.ISSUED)
    issuedAt = Column(DateTime, default=datetime.utcnow)
    usedAt = Column(DateTime, nullable=True)
    expiresAt = Column(DateTime, nullable=False)

    version = Column(Integer, default=1)
    previousTokenId = Column(String, nullable=True)

    # Relationships
    election = relationship("Election", back_populates="voteTokens")
    voter = relationship("Voter", back_populates="voteTokens")

    __table_args__ = (
        Index("VoteToken_electionId_idx", "electionId"),
        Index("VoteToken_tokenHash_idx", "tokenHash"),
        Index("VoteToken_voterId_idx", "voterId"),
    )


class Ballot(Base):
    """
    Ballot model - stores votes WITHOUT voter identification.

    SECURITY: No voterId field - ballots are anonymous.
    The tokenHash links to VoteToken for validation but the voter
    identity is not directly traceable from the ballot.
    """
    __tablename__ = "Ballot"

    id = Column(String, primary_key=True)
    electionId = Column(String, ForeignKey("Election.id", ondelete="CASCADE"), nullable=False)

    # SECURITY: tokenHash, not voterId - breaks voter-ballot linkage
    tokenHash = Column(String, unique=True, nullable=False)

    # Cryptographic commitment
    commitmentHash = Column(String, unique=True, nullable=False)
    commitmentSalt = Column(String, nullable=False)  # Encrypted

    # Encrypted ballot content
    encryptedBallot = Column(Text, nullable=True)

    # Blockchain proof
    fabricTxId = Column(String, nullable=True)
    fabricBlockNum = Column(Integer, nullable=True)
    fabricTimestamp = Column(DateTime, nullable=True)

    channel = Column(Enum(VoteChannel), nullable=False)
    status = Column(Enum(BallotStatus), default=BallotStatus.PENDING)

    submittedAt = Column(DateTime, default=datetime.utcnow)
    confirmedAt = Column(DateTime, nullable=True)
    talliedAt = Column(DateTime, nullable=True)

    version = Column(Integer, default=1)
    previousBallotId = Column(String, nullable=True)

    metadata = Column(JSON, default={})

    # Relationships
    election = relationship("Election", back_populates="ballots")
    votes = relationship("Vote", back_populates="ballot")

    __table_args__ = (
        Index("Ballot_electionId_idx", "electionId"),
        Index("Ballot_tokenHash_idx", "tokenHash"),
        Index("Ballot_commitmentHash_idx", "commitmentHash"),
        Index("Ballot_fabricTxId_idx", "fabricTxId"),
    )


class Contest(Base):
    """Contest within an election."""
    __tablename__ = "Contest"

    id = Column(String, primary_key=True)
    electionId = Column(String, ForeignKey("Election.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    sortOrder = Column(Integer, default=0)

    election = relationship("Election", back_populates="contests")
    options = relationship("ContestOption", back_populates="contest")
    votes = relationship("Vote", back_populates="contest")


class ContestOption(Base):
    """Option/candidate within a contest."""
    __tablename__ = "ContestOption"

    id = Column(String, primary_key=True)
    contestId = Column(String, ForeignKey("Contest.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    sortOrder = Column(Integer, default=0)

    contest = relationship("Contest", back_populates="options")
    votes = relationship("Vote", back_populates="option")


class Vote(Base):
    """Individual vote record within a ballot."""
    __tablename__ = "Vote"

    id = Column(String, primary_key=True)
    ballotId = Column(String, ForeignKey("Ballot.id", ondelete="CASCADE"), nullable=False)
    contestId = Column(String, ForeignKey("Contest.id", ondelete="CASCADE"), nullable=False)
    optionId = Column(String, ForeignKey("ContestOption.id"), nullable=True)

    rank = Column(Integer, nullable=True)  # For ranked choice
    weight = Column(Integer, nullable=True)  # For weighted voting
    score = Column(Integer, nullable=True)  # For score voting
    writeIn = Column(String, nullable=True)  # For write-ins

    createdAt = Column(DateTime, default=datetime.utcnow)

    ballot = relationship("Ballot", back_populates="votes")
    contest = relationship("Contest", back_populates="votes")
    option = relationship("ContestOption", back_populates="votes")

    __table_args__ = (
        Index("Vote_ballotId_idx", "ballotId"),
        Index("Vote_contestId_idx", "contestId"),
        Index("Vote_optionId_idx", "optionId"),
    )


class AccessCodeStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    USED = "USED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class AccessCodeScope(str, enum.Enum):
    VOTER = "VOTER"  # Maps to specific voter
    OPEN = "OPEN"    # Any eligible voter can use


class AccessCode(Base):
    """
    Access codes for voter verification.

    Access codes provide a way for voters to prove eligibility
    without revealing their identity upfront. The code can map
    to a specific voter (pre-registered) or be open (first-come).
    """
    __tablename__ = "AccessCode"

    id = Column(String, primary_key=True)
    electionId = Column(String, ForeignKey("Election.id", ondelete="CASCADE"), nullable=False)

    # The code itself (hashed for security)
    codeHash = Column(String, unique=True, nullable=False)

    # Scope determines how the code can be used
    scope = Column(Enum(AccessCodeScope), default=AccessCodeScope.VOTER)

    # Optional: Link to specific voter (for pre-registered voters)
    voterId = Column(String, ForeignKey("Voter.id", ondelete="SET NULL"), nullable=True)

    # Status tracking
    status = Column(Enum(AccessCodeStatus), default=AccessCodeStatus.ACTIVE)

    # Rate limiting: track failed attempts
    failedAttempts = Column(Integer, default=0)
    lastAttemptAt = Column(DateTime, nullable=True)
    lockedUntil = Column(DateTime, nullable=True)

    # Usage tracking
    usedAt = Column(DateTime, nullable=True)
    usedByIp = Column(String, nullable=True)

    # Expiration
    expiresAt = Column(DateTime, nullable=True)

    # Delivery tracking
    deliveryMethod = Column(String, nullable=True)  # email, sms, whatsapp, print
    deliveredAt = Column(DateTime, nullable=True)

    createdAt = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("AccessCode_electionId_idx", "electionId"),
        Index("AccessCode_codeHash_idx", "codeHash"),
        Index("AccessCode_voterId_idx", "voterId"),
        Index("AccessCode_status_idx", "status"),
    )


class AuditLog(Base):
    """Audit log for all security-relevant actions."""
    __tablename__ = "AuditLog"

    id = Column(String, primary_key=True)
    userId = Column(String, nullable=True)
    electionId = Column(String, nullable=True)
    orgId = Column(String, nullable=True)

    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    resourceId = Column(String, nullable=True)

    details = Column(JSON, default={})
    ipAddress = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)

    # Hash chain for tamper detection
    hash = Column(String, nullable=False)
    previousHash = Column(String, nullable=True)

    createdAt = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("AuditLog_userId_idx", "userId"),
        Index("AuditLog_electionId_idx", "electionId"),
        Index("AuditLog_action_idx", "action"),
    )
