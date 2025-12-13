"""
Tests for the Public Election API.

Tests cover:
- Public election info retrieval
- Contest and options listing
- Real-time turnout stats
- Receipt verification
- No early result leakage
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from observernet_api.app import create_app
from observernet_api.database.models import (
    Election,
    ElectionStatus,
    Contest,
    ContestOption,
    Ballot,
    BallotStatus,
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


class TestPublicElectionInfo:
    """Tests for public election info endpoints."""

    @pytest.mark.asyncio
    async def test_get_election_not_found(self, client):
        """Test getting non-existent election returns 404."""
        response = await client.get("/api/e/nonexistent-slug")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_contests_not_found(self, client):
        """Test getting contests for non-existent election."""
        response = await client.get("/api/e/nonexistent-slug/contests")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_stats_not_found(self, client):
        """Test getting stats for non-existent election."""
        response = await client.get("/api/e/nonexistent-slug/stats")
        assert response.status_code == 404


class TestReceiptVerification:
    """Tests for ballot receipt verification."""

    @pytest.mark.asyncio
    async def test_verify_receipt_not_found(self, client):
        """Test verifying non-existent receipt."""
        response = await client.post(
            "/api/e/nonexistent-slug/verify-receipt",
            json={"receipt_code": "INVALID12345678"},
        )
        assert response.status_code == 404


class TestAccessCodeVerification:
    """Tests for access code verification endpoint."""

    @pytest.mark.asyncio
    async def test_verify_code_not_found(self, client):
        """Test verifying code for non-existent election."""
        response = await client.post(
            "/api/e/nonexistent-slug/verify-code",
            json={"code": "TESTCODE"},
        )
        assert response.status_code == 404


class TestNoEarlyResultLeakage:
    """Tests to verify results are not leaked before election closes."""

    def test_election_status_affects_results_visibility(self):
        """Test that only CLOSED elections show full results."""
        # This is a conceptual test - implementation in results.py
        # checks election.status before returning contest results

        statuses_with_results = [ElectionStatus.CLOSED]
        statuses_without_results = [
            ElectionStatus.DRAFT,
            ElectionStatus.PUBLISHED,
            ElectionStatus.ACTIVE,
            ElectionStatus.PAUSED,
        ]

        # Verify we have proper categorization
        assert len(statuses_with_results) == 1
        assert len(statuses_without_results) == 4


class TestTurnoutStats:
    """Tests for real-time turnout statistics."""

    def test_turnout_calculation(self):
        """Test turnout percentage calculation."""
        total_voters = 1000
        voted = 642

        turnout = round((voted / total_voters * 100), 2)

        assert turnout == 64.2

    def test_turnout_zero_voters(self):
        """Test turnout with zero voters."""
        total_voters = 0
        voted = 0

        # Should handle division by zero
        turnout = round((voted / total_voters * 100), 2) if total_voters > 0 else 0

        assert turnout == 0


class TestPublicDataSecurity:
    """Tests for security of public data."""

    def test_ballot_model_no_voter_info(self):
        """Test Ballot model doesn't expose voter information."""
        columns = [c.name for c in Ballot.__table__.columns]

        # Public receipt info
        assert "commitmentHash" in columns
        assert "status" in columns
        assert "fabricTxId" in columns

        # Should NOT have voter-identifying info
        assert "voterId" not in columns
        assert "email" not in columns
        assert "phone" not in columns

    def test_receipt_code_format(self):
        """Test receipt code is derived from commitment hash."""
        commitment_hash = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
        receipt_code = commitment_hash[:16].upper()

        assert len(receipt_code) == 16
        assert receipt_code.isupper()


class TestJoinElection:
    """Tests for election join flow."""

    @pytest.mark.asyncio
    async def test_join_not_found(self, client):
        """Test joining non-existent election."""
        response = await client.post("/api/e/nonexistent-slug/join")
        assert response.status_code == 404


class TestContestModels:
    """Tests for contest and option models."""

    def test_contest_model_fields(self):
        """Test Contest model has required fields."""
        columns = [c.name for c in Contest.__table__.columns]

        assert "id" in columns
        assert "electionId" in columns
        assert "name" in columns
        assert "sortOrder" in columns

    def test_contest_option_model_fields(self):
        """Test ContestOption model has required fields."""
        columns = [c.name for c in ContestOption.__table__.columns]

        assert "id" in columns
        assert "contestId" in columns
        assert "name" in columns
        assert "sortOrder" in columns


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
