"""
Tests for the Admin API.

Tests cover:
- Dashboard statistics
- Audit log access
- Pending review queue
- Daily stats for charts
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from observernet_api.app import create_app
from observernet_api.database.models import (
    AuditLog,
    Ballot,
    BallotStatus,
    VoteChannel,
)


@pytest.fixture
def app():
    """Create test application."""
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


class TestDashboardAPI:
    """Tests for admin dashboard endpoints."""

    @pytest.mark.asyncio
    async def test_dashboard_unauthorized(self, client):
        """Test dashboard access without auth fails."""
        response = await client.get("/api/admin/dashboard")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_elections_list_unauthorized(self, client):
        """Test elections list without auth fails."""
        response = await client.get("/api/admin/elections")
        assert response.status_code == 401


class TestAuditLogAPI:
    """Tests for audit log endpoints."""

    @pytest.mark.asyncio
    async def test_audit_log_unauthorized(self, client):
        """Test audit log access without auth fails."""
        response = await client.get("/api/admin/audit-log")
        assert response.status_code == 401


class TestAuditLogModels:
    """Tests for audit log database models."""

    def test_audit_log_fields(self):
        """Test AuditLog model has required fields."""
        columns = [c.name for c in AuditLog.__table__.columns]

        # Core fields
        assert "id" in columns
        assert "action" in columns
        assert "resource" in columns
        assert "resourceId" in columns
        assert "details" in columns
        assert "createdAt" in columns

        # Hash chain fields for tamper detection
        assert "hash" in columns
        assert "previousHash" in columns

        # Context fields
        assert "userId" in columns
        assert "electionId" in columns
        assert "orgId" in columns
        assert "ipAddress" in columns

    def test_ballot_channels(self):
        """Test VoteChannel enum includes offline/paper."""
        assert VoteChannel.WEB.value == "WEB"
        assert VoteChannel.MOBILE.value == "MOBILE"
        assert VoteChannel.OFFLINE.value == "OFFLINE"
        assert VoteChannel.PAPER.value == "PAPER"

    def test_ballot_status_enum(self):
        """Test BallotStatus enum values."""
        assert BallotStatus.PENDING.value == "PENDING"
        assert BallotStatus.CONFIRMED.value == "CONFIRMED"
        assert BallotStatus.REJECTED.value == "REJECTED"
        assert BallotStatus.TALLIED.value == "TALLIED"


class TestAuditChainIntegrity:
    """Tests for audit log hash chain integrity."""

    def test_audit_hash_chain(self):
        """Test audit hash chain creation."""
        from observernet_api.services.crypto import create_audit_chain_hash

        # First entry (no previous hash)
        hash1 = create_audit_chain_hash(
            previous_hash="",
            action="election.created",
            resource="Election",
            resource_id="elec_123",
            timestamp="2024-01-01T00:00:00Z",
            details={"name": "Test Election"},
        )

        # Second entry (with previous hash)
        hash2 = create_audit_chain_hash(
            previous_hash=hash1,
            action="election.published",
            resource="Election",
            resource_id="elec_123",
            timestamp="2024-01-02T00:00:00Z",
            details={},
        )

        # Hashes should be different
        assert hash1 != hash2

        # Both should be 64 hex chars (SHA-256)
        assert len(hash1) == 64
        assert len(hash2) == 64

    def test_audit_hash_deterministic(self):
        """Test audit hash is deterministic."""
        from observernet_api.services.crypto import create_audit_chain_hash

        params = {
            "previous_hash": "abc123",
            "action": "test.action",
            "resource": "Test",
            "resource_id": "test_123",
            "timestamp": "2024-01-01T00:00:00Z",
            "details": {"key": "value"},
        }

        hash1 = create_audit_chain_hash(**params)
        hash2 = create_audit_chain_hash(**params)

        assert hash1 == hash2


class TestPendingReviews:
    """Tests for pending review queue functionality."""

    def test_ballot_model_fields(self):
        """Test Ballot model has fields for review workflow."""
        columns = [c.name for c in Ballot.__table__.columns]

        # Channel field for distinguishing paper/offline
        assert "channel" in columns

        # Status for tracking review state
        assert "status" in columns

        # Metadata for storing OCR results etc
        assert "metadata" in columns


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
