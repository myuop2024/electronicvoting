"""
Comprehensive tests for the voting API.

Tests cover:
- Vote anonymity (no voter-ballot linkage)
- Double-vote prevention
- Cryptographic commitments
- Token lifecycle
- Ballot submission flow
- Verification
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Import app and models
from observernet_api.app import create_app
from observernet_api.services.crypto import (
    generate_vote_token,
    hash_vote_token,
    create_ballot_commitment,
    generate_commitment_salt,
    encrypt_ballot_selections,
    decrypt_ballot_selections,
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


class TestCryptoFunctions:
    """Tests for cryptographic utility functions."""

    def test_generate_vote_token(self):
        """Test vote token generation produces unique tokens."""
        token1, hash1 = generate_vote_token()
        token2, hash2 = generate_vote_token()

        # Tokens should be unique
        assert token1 != token2
        assert hash1 != hash2

        # Token should be 64 hex chars (32 bytes)
        assert len(token1) == 64
        assert len(hash1) == 64

    def test_hash_vote_token_deterministic(self):
        """Test that hashing is deterministic."""
        token = "test_token_12345"
        hash1 = hash_vote_token(token)
        hash2 = hash_vote_token(token)

        assert hash1 == hash2

    def test_hash_vote_token_different_inputs(self):
        """Test that different tokens produce different hashes."""
        hash1 = hash_vote_token("token1")
        hash2 = hash_vote_token("token2")

        assert hash1 != hash2

    def test_create_ballot_commitment(self):
        """Test ballot commitment creation."""
        commitment = create_ballot_commitment(
            election_id="election_123",
            encrypted_ballot="encrypted_data",
            salt="random_salt",
            timestamp=1234567890,
        )

        # Commitment should be 64 hex chars (SHA-256)
        assert len(commitment) == 64

    def test_commitment_deterministic(self):
        """Test that commitments are deterministic."""
        params = {
            "election_id": "election_123",
            "encrypted_ballot": "encrypted_data",
            "salt": "random_salt",
            "timestamp": 1234567890,
        }

        commitment1 = create_ballot_commitment(**params)
        commitment2 = create_ballot_commitment(**params)

        assert commitment1 == commitment2

    def test_commitment_different_inputs(self):
        """Test that different inputs produce different commitments."""
        base_params = {
            "election_id": "election_123",
            "encrypted_ballot": "encrypted_data",
            "salt": "random_salt",
            "timestamp": 1234567890,
        }

        commitment1 = create_ballot_commitment(**base_params)

        # Change one parameter
        commitment2 = create_ballot_commitment(
            **{**base_params, "election_id": "election_456"}
        )

        assert commitment1 != commitment2

    def test_encrypt_decrypt_ballot(self):
        """Test ballot encryption and decryption roundtrip."""
        selections = [
            {"contestId": "contest1", "optionId": "option_a"},
            {"contestId": "contest2", "optionId": "option_b"},
        ]
        election_id = "test_election"

        # Encrypt
        encrypted = encrypt_ballot_selections(selections, election_id)

        assert "encrypted" in encrypted
        assert "iv" in encrypted
        assert "authTag" in encrypted

        # Decrypt
        decrypted = decrypt_ballot_selections(encrypted, election_id)

        assert decrypted == selections

    def test_commitment_salt_unique(self):
        """Test that generated salts are unique."""
        salt1 = generate_commitment_salt()
        salt2 = generate_commitment_salt()

        assert salt1 != salt2
        assert len(salt1) > 32  # Base64 encoded 32 bytes


class TestVoteAnonymity:
    """Tests to verify vote anonymity is preserved."""

    def test_ballot_has_no_voter_id(self):
        """Verify Ballot model has no voterId field."""
        from observernet_api.database.models import Ballot

        # Get column names
        columns = [c.name for c in Ballot.__table__.columns]

        # voterId should NOT be present
        assert "voterId" not in columns
        assert "voter_id" not in columns

        # tokenHash should be present instead
        assert "tokenHash" in columns

    def test_voter_has_no_ballot_relation(self):
        """Verify Voter model has no direct ballot relation."""
        from observernet_api.database.models import Voter

        # Check relationships
        relationships = [r.key for r in Voter.__mapper__.relationships]

        # Should have voteTokens but NOT ballot
        assert "voteTokens" in relationships
        assert "ballot" not in relationships
        assert "ballots" not in relationships

    def test_vote_token_breaks_linkage(self):
        """Test that VoteToken provides unlinkability."""
        from observernet_api.database.models import VoteToken, Ballot

        # VoteToken has voterId (links to voter during issuance)
        vt_columns = [c.name for c in VoteToken.__table__.columns]
        assert "voterId" in vt_columns
        assert "tokenHash" in vt_columns

        # Ballot has tokenHash (for validation) but NOT voterId
        ballot_columns = [c.name for c in Ballot.__table__.columns]
        assert "tokenHash" in ballot_columns
        assert "voterId" not in ballot_columns

        # This means: Ballot -> tokenHash -> VoteToken -> voterId
        # But VoteToken doesn't link back to Ballot, breaking traceability


class TestDoubleVotePrevention:
    """Tests for double-vote prevention mechanisms."""

    def test_voter_status_enum(self):
        """Test VoterStatus enum includes VOTED status."""
        from observernet_api.database.models import VoterStatus

        assert VoterStatus.VOTED.value == "VOTED"
        assert VoterStatus.VERIFIED.value == "VERIFIED"

    def test_vote_token_status_enum(self):
        """Test VoteTokenStatus enum for token lifecycle."""
        from observernet_api.database.models import VoteTokenStatus

        assert VoteTokenStatus.ISSUED.value == "ISSUED"
        assert VoteTokenStatus.USED.value == "USED"
        assert VoteTokenStatus.EXPIRED.value == "EXPIRED"
        assert VoteTokenStatus.REVOKED.value == "REVOKED"


class TestVotingAPIFlow:
    """Integration tests for the complete voting flow."""

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test API health check endpoint."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @pytest.mark.asyncio
    async def test_token_request_invalid_election(self, client):
        """Test token request with invalid election."""
        response = await client.post(
            "/api/vote/token",
            json={
                "electionId": "nonexistent_election",
                "voterHash": "test_voter_hash",
            },
        )
        # Should return 404 for nonexistent election
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_ballot_submit_invalid_token(self, client):
        """Test ballot submission with invalid token."""
        response = await client.post(
            "/api/vote/submit",
            json={
                "electionId": "test_election",
                "token": "invalid_token",
                "selections": [{"contestId": "c1", "optionId": "o1"}],
            },
        )
        # Should return 401 for invalid token
        assert response.status_code == 401


class TestFabricIntegration:
    """Tests for Hyperledger Fabric integration."""

    @pytest.mark.asyncio
    async def test_fabric_client_mock(self):
        """Test Fabric client in mock mode."""
        from observernet_api.services.fabric import FabricClient

        client = FabricClient()
        await client.connect()

        result = await client.submit_ballot_commitment(
            election_id="test_election",
            ballot_id="test_ballot",
            commitment_hash="abc123",
            timestamp=datetime.utcnow(),
        )

        assert "txId" in result
        assert "blockNumber" in result
        assert result["status"] == "COMMITTED"

    @pytest.mark.asyncio
    async def test_ballot_history(self):
        """Test querying ballot history from Fabric."""
        from observernet_api.services.fabric import FabricClient

        client = FabricClient()
        await client.connect()

        # Submit a few ballots
        for i in range(3):
            await client.submit_ballot_commitment(
                election_id="test_election",
                ballot_id=f"ballot_{i}",
                commitment_hash=f"hash_{i}",
                timestamp=datetime.utcnow(),
            )

        # Query history
        history = await client.get_ballot_history("test_election")

        assert len(history) == 3


class TestOCRService:
    """Tests for paper ballot OCR service."""

    def test_mark_type_enum(self):
        """Test MarkType enum values."""
        from observernet_api.services.ocr import MarkType

        assert MarkType.FILLED.value == "filled"
        assert MarkType.EMPTY.value == "empty"
        assert MarkType.AMBIGUOUS.value == "ambiguous"

    @pytest.mark.asyncio
    async def test_ocr_mock_result(self):
        """Test OCR service returns mock result without dependencies."""
        from observernet_api.services.ocr import PaperBallotOCR

        ocr = PaperBallotOCR()

        # Create a minimal image (1x1 white pixel PNG)
        image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa75\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82'

        result = await ocr.process_ballot_image(
            image_data=image_data,
            election_id="test_election",
            ballot_template={},
        )

        assert result.ballot_id.startswith("pb_")
        assert result.election_id == "test_election"


class TestEmailService:
    """Tests for email service."""

    @pytest.mark.asyncio
    async def test_mock_email_provider(self):
        """Test mock email provider stores sent emails."""
        from observernet_api.services.email import MockEmailProvider, EmailMessage

        provider = MockEmailProvider()

        message = EmailMessage(
            to="test@example.com",
            subject="Test Subject",
            html_body="<p>Test body</p>",
        )

        result = await provider.send(message)

        assert result["status"] == "sent"
        assert len(provider.sent_emails) == 1
        assert provider.sent_emails[0].to == "test@example.com"

    @pytest.mark.asyncio
    async def test_email_service_password_reset(self):
        """Test password reset email generation."""
        from observernet_api.services.email import EmailService, MockEmailProvider

        provider = MockEmailProvider()
        service = EmailService(provider=provider)

        result = await service.send_password_reset(
            to_email="user@example.com",
            reset_token="test_token_123",
            user_name="Test User",
        )

        assert result["status"] == "sent"
        assert len(provider.sent_emails) == 1

        sent = provider.sent_emails[0]
        assert "Reset Your Password" in sent.subject
        assert "test_token_123" in sent.html_body


class TestWebSocketEvents:
    """Tests for WebSocket broadcast functions."""

    @pytest.mark.asyncio
    async def test_connection_manager(self):
        """Test WebSocket connection manager."""
        from observernet_api.api.v1.websocket import ConnectionManager

        manager = ConnectionManager()

        # Check initial state
        assert len(manager.election_connections) == 0
        assert len(manager.ballot_connections) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
