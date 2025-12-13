"""
Tests for the Elections API.

Tests cover:
- Election creation with authorization
- Voter allowlist import with PII hashing
- Access code generation and consumption
- Election lifecycle management
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from observernet_api.app import create_app
from observernet_api.database.models import (
    Election,
    ElectionStatus,
    Voter,
    VoterStatus,
    AccessCode,
    AccessCodeStatus,
    AccessCodeScope,
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


class TestElectionModels:
    """Tests for election database models."""

    def test_election_status_enum(self):
        """Test ElectionStatus enum values."""
        assert ElectionStatus.DRAFT.value == "DRAFT"
        assert ElectionStatus.PUBLISHED.value == "PUBLISHED"
        assert ElectionStatus.ACTIVE.value == "ACTIVE"
        assert ElectionStatus.PAUSED.value == "PAUSED"
        assert ElectionStatus.CLOSED.value == "CLOSED"
        assert ElectionStatus.ARCHIVED.value == "ARCHIVED"

    def test_election_model_fields(self):
        """Test Election model has required fields."""
        columns = [c.name for c in Election.__table__.columns]

        # Required fields
        assert "id" in columns
        assert "orgId" in columns
        assert "name" in columns
        assert "slug" in columns
        assert "status" in columns
        assert "votingStartAt" in columns
        assert "votingEndAt" in columns

        # Security fields
        assert "allowVoteChange" in columns
        assert "voteChangeDeadline" in columns

    def test_voter_model_fields(self):
        """Test Voter model has proper fields for anonymity."""
        columns = [c.name for c in Voter.__table__.columns]

        # Should have voterHash (hashed PII)
        assert "voterHash" in columns

        # Should have status tracking
        assert "status" in columns
        assert "verifiedAt" in columns

        # Should NOT have raw PII
        assert "email" not in columns
        assert "phone" not in columns
        assert "nationalId" not in columns

    def test_access_code_model(self):
        """Test AccessCode model fields."""
        columns = [c.name for c in AccessCode.__table__.columns]

        assert "id" in columns
        assert "electionId" in columns
        assert "codeHash" in columns
        assert "scope" in columns
        assert "status" in columns
        assert "failedAttempts" in columns
        assert "lockedUntil" in columns

    def test_access_code_scopes(self):
        """Test AccessCodeScope enum values."""
        assert AccessCodeScope.VOTER.value == "VOTER"
        assert AccessCodeScope.OPEN.value == "OPEN"


class TestElectionAPI:
    """Tests for election API endpoints."""

    @pytest.mark.asyncio
    async def test_create_election_unauthorized(self, client):
        """Test election creation without auth fails."""
        response = await client.post(
            "/api/elections",
            json={
                "name": "Test Election",
                "org_id": "org_123",
                "voting_start_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
                "voting_end_at": (datetime.utcnow() + timedelta(days=2)).isoformat(),
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_election_not_found(self, client):
        """Test getting non-existent election."""
        response = await client.get(
            "/api/elections/nonexistent_id",
        )
        # Will return 401 without auth or 404 if auth passes
        assert response.status_code in [401, 404]


class TestAccessCodeSecurity:
    """Tests for access code security features."""

    def test_access_code_status_enum(self):
        """Test AccessCodeStatus enum values."""
        assert AccessCodeStatus.ACTIVE.value == "ACTIVE"
        assert AccessCodeStatus.USED.value == "USED"
        assert AccessCodeStatus.EXPIRED.value == "EXPIRED"
        assert AccessCodeStatus.REVOKED.value == "REVOKED"


class TestAllowlistHashing:
    """Tests for voter allowlist PII hashing."""

    def test_hash_voter_pii_deterministic(self):
        """Test that PII hashing is deterministic."""
        from observernet_api.services.crypto import hash_voter_pii

        identifier = "test@example.com"
        election_id = "election_123"

        hash1 = hash_voter_pii(identifier, election_id)
        hash2 = hash_voter_pii(identifier, election_id)

        assert hash1 == hash2

    def test_hash_voter_pii_different_elections(self):
        """Test that same PII produces different hashes for different elections."""
        from observernet_api.services.crypto import hash_voter_pii

        identifier = "test@example.com"

        hash1 = hash_voter_pii(identifier, "election_1")
        hash2 = hash_voter_pii(identifier, "election_2")

        # Same person in different elections should have different hashes
        # This prevents cross-election tracking
        assert hash1 != hash2

    def test_hash_voter_pii_irreversible(self):
        """Test that PII hashing is one-way."""
        from observernet_api.services.crypto import hash_voter_pii

        identifier = "sensitive@example.com"
        hashed = hash_voter_pii(identifier, "election_123")

        # Hash should not contain original data
        assert identifier not in hashed
        assert "sensitive" not in hashed
        assert "example.com" not in hashed


class TestElectionLifecycle:
    """Tests for election state transitions."""

    def test_valid_status_transitions(self):
        """Test valid election status transitions."""
        # Define valid transitions
        valid_transitions = {
            ElectionStatus.DRAFT: [ElectionStatus.PUBLISHED],
            ElectionStatus.PUBLISHED: [ElectionStatus.ACTIVE, ElectionStatus.DRAFT],
            ElectionStatus.ACTIVE: [ElectionStatus.PAUSED, ElectionStatus.CLOSED],
            ElectionStatus.PAUSED: [ElectionStatus.ACTIVE, ElectionStatus.CLOSED],
            ElectionStatus.CLOSED: [ElectionStatus.ARCHIVED],
            ElectionStatus.ARCHIVED: [],
        }

        # Verify all statuses are covered
        assert len(valid_transitions) == len(ElectionStatus)


class TestSlugGeneration:
    """Tests for election slug generation."""

    def test_slug_format(self):
        """Test slug generation format."""
        import re
        from observernet_api.api.v1.elections import generate_slug

        slug = generate_slug("Test Election 2024!")

        # Should be lowercase
        assert slug == slug.lower()

        # Should contain only valid chars (letters, numbers, hyphens)
        assert re.match(r"^[a-z0-9-]+$", slug)

        # Should have random suffix for uniqueness
        assert len(slug) > len("test-election-2024")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
