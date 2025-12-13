"""
End-to-end integration tests for the complete voting flow.

Tests the full user journey:
1. Voter registration → 2. Identity verification → 3. Token issuance →
4. Ballot submission → 5. Blockchain anchoring → 6. Receipt verification

These tests validate that all components work together correctly:
- Database persistence
- Blockchain integration (mock mode)
- Cryptographic operations
- WebSocket broadcasting
- API endpoints
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from observernet_api.database.models import (
    Election,
    ElectionStatus,
    Voter,
    VoterStatus,
    VoteToken,
    VoteTokenStatus,
    Ballot,
    BallotStatus,
    Contest,
    ContestOption,
)
from observernet_api.services.crypto import (
    generate_vote_token,
    encrypt_ballot_selections,
    create_ballot_commitment,
    hash_voter_pii,
)


pytestmark = pytest.mark.asyncio


class TestEndToEndVotingFlow:
    """Test complete voting flow from registration to verification."""

    async def test_complete_voter_journey(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        sample_election: Election,
    ):
        """
        Test the complete end-to-end voting flow.

        Flow:
        1. Admin creates election with contests
        2. Voter registers (added to allowlist)
        3. Voter requests vote token
        4. Voter submits encrypted ballot
        5. Ballot is anchored to blockchain
        6. Voter verifies their ballot
        """
        # ===================================================================
        # PHASE 1: Election Setup
        # ===================================================================

        # Create contest and options
        contest = Contest(
            id=f"con_{sample_election.id}_1",
            electionId=sample_election.id,
            title="Board President",
            description="Select one candidate",
            type="plurality",
            maxSelections=1,
            displayOrder=1,
        )
        db_session.add(contest)

        option1 = ContestOption(
            id=f"opt_{contest.id}_1",
            contestId=contest.id,
            title="Alice Johnson",
            displayOrder=1,
        )
        option2 = ContestOption(
            id=f"opt_{contest.id}_2",
            contestId=contest.id,
            title="Bob Smith",
            displayOrder=2,
        )
        db_session.add_all([option1, option2])

        # Activate election
        sample_election.status = ElectionStatus.ACTIVE
        sample_election.votingStartsAt = datetime.utcnow() - timedelta(hours=1)
        sample_election.votingEndsAt = datetime.utcnow() + timedelta(hours=24)
        await db_session.commit()

        # ===================================================================
        # PHASE 2: Voter Registration
        # ===================================================================

        voter_email = "voter@example.com"
        voter_hash = hash_voter_pii(voter_email, sample_election.id)

        # Admin adds voter to allowlist
        voter = Voter(
            id=f"vtr_{voter_hash[:12]}",
            electionId=sample_election.id,
            voterHash=voter_hash,
            status=VoterStatus.VERIFIED,  # Assume already verified via Didit
            verifiedAt=datetime.utcnow(),
        )
        db_session.add(voter)
        await db_session.commit()

        # ===================================================================
        # PHASE 3: Token Issuance
        # ===================================================================

        # Voter requests anonymous vote token
        token_response = await client.post(
            f"/api/v1/voting/token",
            json={
                "electionId": sample_election.id,
                "voterHash": voter_hash,
            },
        )

        assert token_response.status_code == 200
        token_data = token_response.json()
        assert "voteToken" in token_data
        assert "expiresAt" in token_data
        assert token_data["message"] == "Vote token issued successfully"

        vote_token = token_data["voteToken"]

        # Verify token was stored in database
        token_result = await db_session.execute(
            select(VoteToken).where(VoteToken.voterId == voter.id)
        )
        db_token = token_result.scalar_one()
        assert db_token.status == VoteTokenStatus.ISSUED

        # ===================================================================
        # PHASE 4: Ballot Submission
        # ===================================================================

        # Voter prepares ballot selections
        selections = [
            {
                "contestId": contest.id,
                "optionIds": [option1.id],  # Vote for Alice Johnson
            }
        ]

        # Encrypt ballot (client-side operation)
        encrypted_data = encrypt_ballot_selections(
            selections=selections,
            election_id=sample_election.id,
        )

        # Create commitment hash
        commitment_hash = create_ballot_commitment(
            election_id=sample_election.id,
            encrypted_ballot=encrypted_data["encrypted"],
            salt=encrypted_data["salt"],
            timestamp=datetime.utcnow(),
        )

        # Submit ballot
        submit_response = await client.post(
            f"/api/v1/voting/submit",
            json={
                "electionId": sample_election.id,
                "voteToken": vote_token,
                "encryptedBallot": encrypted_data["encrypted"],
                "salt": encrypted_data["salt"],
                "iv": encrypted_data["iv"],
                "selections": selections,  # For tallying (stored encrypted)
            },
        )

        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        assert "commitmentHash" in submit_data
        assert "fabricTxId" in submit_data
        assert "receiptCode" in submit_data
        assert submit_data["commitmentHash"] == commitment_hash

        # ===================================================================
        # PHASE 5: Verify Database State
        # ===================================================================

        # Check voter status updated
        await db_session.refresh(voter)
        assert voter.status == VoterStatus.VOTED

        # Check token status updated
        await db_session.refresh(db_token)
        assert db_token.status == VoteTokenStatus.USED

        # Check ballot created
        ballot_result = await db_session.execute(
            select(Ballot).where(Ballot.commitmentHash == commitment_hash)
        )
        ballot = ballot_result.scalar_one()
        assert ballot.status == BallotStatus.SUBMITTED
        assert ballot.electionId == sample_election.id
        assert ballot.fabricTxId is not None  # Anchored to blockchain (mock)

        # Verify ballot has NO direct link to voter (anonymity)
        assert not hasattr(ballot, "voterId") or ballot.voterId is None

        # ===================================================================
        # PHASE 6: Ballot Verification
        # ===================================================================

        # Voter verifies their ballot using commitment hash
        verify_response = await client.post(
            f"/api/v1/voting/verify",
            json={
                "commitmentHash": commitment_hash,
            },
        )

        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["found"] is True
        assert verify_data["verified"] is True
        assert verify_data["electionId"] == sample_election.id
        assert verify_data["electionName"] == sample_election.name
        assert verify_data["fabricTxId"] == ballot.fabricTxId
        assert verify_data["status"] == BallotStatus.SUBMITTED.value

    async def test_double_vote_prevention(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        sample_election: Election,
    ):
        """
        Test that voters cannot vote twice in the same election.

        This validates the anti-double-voting mechanisms:
        1. Token can only be used once
        2. Voter status prevents re-voting (unless allowVoteChange=True)
        """
        # Setup: Create verified voter
        voter_email = "double-voter@example.com"
        voter_hash = hash_voter_pii(voter_email, sample_election.id)

        voter = Voter(
            id=f"vtr_{voter_hash[:12]}",
            electionId=sample_election.id,
            voterHash=voter_hash,
            status=VoterStatus.VERIFIED,
        )
        db_session.add(voter)

        # Activate election
        sample_election.status = ElectionStatus.ACTIVE
        sample_election.votingStartsAt = datetime.utcnow() - timedelta(hours=1)
        sample_election.votingEndsAt = datetime.utcnow() + timedelta(hours=24)
        sample_election.allowVoteChange = False  # No vote changes allowed
        await db_session.commit()

        # ===================================================================
        # ATTEMPT 1: First vote (should succeed)
        # ===================================================================

        # Get token
        token_response1 = await client.post(
            f"/api/v1/voting/token",
            json={
                "electionId": sample_election.id,
                "voterHash": voter_hash,
            },
        )
        assert token_response1.status_code == 200
        token1 = token_response1.json()["voteToken"]

        # Submit ballot
        encrypted_data = encrypt_ballot_selections(
            selections=[],
            election_id=sample_election.id,
        )

        submit_response1 = await client.post(
            f"/api/v1/voting/submit",
            json={
                "electionId": sample_election.id,
                "voteToken": token1,
                "encryptedBallot": encrypted_data["encrypted"],
                "salt": encrypted_data["salt"],
                "iv": encrypted_data["iv"],
                "selections": [],
            },
        )
        assert submit_response1.status_code == 200

        # ===================================================================
        # ATTEMPT 2: Second vote (should fail)
        # ===================================================================

        # Try to get another token
        token_response2 = await client.post(
            f"/api/v1/voting/token",
            json={
                "electionId": sample_election.id,
                "voterHash": voter_hash,
            },
        )

        # Should fail because voter already voted and no vote changes allowed
        assert token_response2.status_code == 409
        assert "already voted" in token_response2.json()["detail"].lower()

    async def test_vote_change_when_allowed(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        sample_election: Election,
    ):
        """
        Test that voters CAN change their vote when allowVoteChange=True.

        This ensures the vote change functionality works correctly.
        """
        # Setup: Create verified voter
        voter_email = "change-voter@example.com"
        voter_hash = hash_voter_pii(voter_email, sample_election.id)

        voter = Voter(
            id=f"vtr_{voter_hash[:12]}",
            electionId=sample_election.id,
            voterHash=voter_hash,
            status=VoterStatus.VERIFIED,
        )
        db_session.add(voter)

        # Activate election with vote changes allowed
        sample_election.status = ElectionStatus.ACTIVE
        sample_election.votingStartsAt = datetime.utcnow() - timedelta(hours=1)
        sample_election.votingEndsAt = datetime.utcnow() + timedelta(hours=24)
        sample_election.allowVoteChange = True  # Vote changes allowed
        sample_election.voteChangeDeadline = datetime.utcnow() + timedelta(hours=12)
        await db_session.commit()

        # ===================================================================
        # VOTE 1: Initial vote
        # ===================================================================

        token_response1 = await client.post(
            f"/api/v1/voting/token",
            json={"electionId": sample_election.id, "voterHash": voter_hash},
        )
        assert token_response1.status_code == 200

        encrypted_data1 = encrypt_ballot_selections([], sample_election.id)
        submit_response1 = await client.post(
            f"/api/v1/voting/submit",
            json={
                "electionId": sample_election.id,
                "voteToken": token_response1.json()["voteToken"],
                "encryptedBallot": encrypted_data1["encrypted"],
                "salt": encrypted_data1["salt"],
                "iv": encrypted_data1["iv"],
                "selections": [],
            },
        )
        assert submit_response1.status_code == 200
        commitment1 = submit_response1.json()["commitmentHash"]

        # ===================================================================
        # VOTE 2: Changed vote (should succeed)
        # ===================================================================

        token_response2 = await client.post(
            f"/api/v1/voting/token",
            json={"electionId": sample_election.id, "voterHash": voter_hash},
        )
        assert token_response2.status_code == 200

        encrypted_data2 = encrypt_ballot_selections([], sample_election.id)
        submit_response2 = await client.post(
            f"/api/v1/voting/submit",
            json={
                "electionId": sample_election.id,
                "voteToken": token_response2.json()["voteToken"],
                "encryptedBallot": encrypted_data2["encrypted"],
                "salt": encrypted_data2["salt"],
                "iv": encrypted_data2["iv"],
                "selections": [],
            },
        )
        assert submit_response2.status_code == 200
        commitment2 = submit_response2.json()["commitmentHash"]

        # Verify: Two different ballots exist
        assert commitment1 != commitment2

        # Verify: Only the latest ballot is active
        ballots_result = await db_session.execute(
            select(Ballot).where(Ballot.electionId == sample_election.id)
        )
        ballots = ballots_result.scalars().all()
        assert len(ballots) == 2

        # First ballot should be superseded
        ballot1 = next(b for b in ballots if b.commitmentHash == commitment1)
        assert ballot1.status == BallotStatus.SUPERSEDED

        # Second ballot should be active
        ballot2 = next(b for b in ballots if b.commitmentHash == commitment2)
        assert ballot2.status == BallotStatus.SUBMITTED

    async def test_ballot_blockchain_verification(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        sample_election: Election,
    ):
        """
        Test that ballots are properly anchored to blockchain and verifiable.

        This validates:
        1. Ballot commitment is sent to Fabric
        2. Transaction ID is stored
        3. Verification returns blockchain proof
        """
        # Setup and submit a ballot
        voter_hash = hash_voter_pii("blockchain-test@example.com", sample_election.id)

        voter = Voter(
            id=f"vtr_{voter_hash[:12]}",
            electionId=sample_election.id,
            voterHash=voter_hash,
            status=VoterStatus.VERIFIED,
        )
        db_session.add(voter)

        sample_election.status = ElectionStatus.ACTIVE
        sample_election.votingStartsAt = datetime.utcnow() - timedelta(hours=1)
        sample_election.votingEndsAt = datetime.utcnow() + timedelta(hours=24)
        await db_session.commit()

        # Get token and submit ballot
        token_response = await client.post(
            f"/api/v1/voting/token",
            json={"electionId": sample_election.id, "voterHash": voter_hash},
        )
        vote_token = token_response.json()["voteToken"]

        encrypted_data = encrypt_ballot_selections([], sample_election.id)
        submit_response = await client.post(
            f"/api/v1/voting/submit",
            json={
                "electionId": sample_election.id,
                "voteToken": vote_token,
                "encryptedBallot": encrypted_data["encrypted"],
                "salt": encrypted_data["salt"],
                "iv": encrypted_data["iv"],
                "selections": [],
            },
        )

        commitment_hash = submit_response.json()["commitmentHash"]
        fabric_tx_id = submit_response.json()["fabricTxId"]

        # Verify blockchain anchoring
        assert fabric_tx_id is not None
        assert len(fabric_tx_id) > 0

        # Verify ballot in database has blockchain reference
        ballot_result = await db_session.execute(
            select(Ballot).where(Ballot.commitmentHash == commitment_hash)
        )
        ballot = ballot_result.scalar_one()
        assert ballot.fabricTxId == fabric_tx_id

        # Verify via API includes blockchain proof
        verify_response = await client.post(
            f"/api/v1/voting/verify",
            json={"commitmentHash": commitment_hash},
        )
        verify_data = verify_response.json()
        assert verify_data["fabricTxId"] == fabric_tx_id
        assert verify_data["verified"] is True


if __name__ == "__main__":
    # Run with: pytest tests/integration/test_e2e_voting_flow.py -v
    pytest.main([__file__, "-v"])
