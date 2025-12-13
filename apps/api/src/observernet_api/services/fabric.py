"""
Hyperledger Fabric integration service.

This module provides:
- Ballot commitment submission to blockchain
- Transaction verification
- Audit log anchoring
- Result certification

The blockchain provides:
- Immutability: Once recorded, votes cannot be altered
- Transparency: Anyone can verify the ledger
- Decentralization: No single point of trust

ARCHITECTURE:
- Ballot commitments (not vote content) are stored on-chain
- Decryption keys are released only after voting closes
- Results can be independently verified by any observer
"""

import asyncio
import hashlib
import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..config.settings import settings


class FabricGatewayError(Exception):
    """Error communicating with Fabric gateway."""
    pass


class FabricClient:
    """
    Hyperledger Fabric client for election operations.

    In production, this would use the Fabric Gateway SDK.
    This implementation provides the interface and mock for development.
    """

    def __init__(
        self,
        gateway_url: str = None,
        msp_id: str = None,
        channel: str = None,
        chaincode: str = None,
    ):
        self.gateway_url = gateway_url or settings.fabric_gateway_url
        self.msp_id = msp_id or settings.fabric_msp_id
        self.channel = channel or settings.fabric_channel
        self.chaincode = chaincode or settings.fabric_chaincode
        self._connected = False
        self._mock_ledger: Dict[str, Any] = {}  # For development/testing

    async def connect(self) -> bool:
        """
        Establish connection to Fabric gateway.

        In production, this initializes gRPC connection to the gateway.
        """
        if self._connected:
            return True

        try:
            # In production: Initialize Fabric Gateway connection
            # gateway = Gateway()
            # await gateway.connect(connection_profile, identity, ...)

            # For development: Simulate connection
            if self.gateway_url and self.gateway_url != "mock":
                # TODO: Implement actual Fabric Gateway connection
                pass

            self._connected = True
            return True
        except Exception as e:
            raise FabricGatewayError(f"Failed to connect to Fabric: {e}")

    async def disconnect(self):
        """Close connection to Fabric gateway."""
        self._connected = False

    async def submit_ballot_commitment(
        self,
        election_id: str,
        ballot_id: str,
        commitment_hash: str,
        timestamp: datetime,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Submit a ballot commitment to the blockchain.

        This creates an immutable record that the ballot was submitted
        at a specific time with a specific commitment hash.

        The commitment hash is a cryptographic digest of the encrypted
        ballot content - it doesn't reveal the vote, but allows
        verification that the ballot wasn't altered.

        Returns:
            Dict with transaction ID, block number, and timestamp
        """
        if not self._connected:
            await self.connect()

        # Prepare transaction data
        tx_data = {
            "function": "SubmitBallotCommitment",
            "args": {
                "electionId": election_id,
                "ballotId": ballot_id,
                "commitmentHash": commitment_hash,
                "timestamp": timestamp.isoformat(),
                "metadata": metadata or {},
            },
        }

        try:
            # In production: Submit transaction to chaincode
            # contract = network.get_contract(self.chaincode)
            # result = await contract.submit_transaction(
            #     "SubmitBallotCommitment",
            #     election_id,
            #     ballot_id,
            #     commitment_hash,
            #     timestamp.isoformat(),
            # )

            # For development: Simulate blockchain transaction
            tx_id = hashlib.sha256(
                f"{ballot_id}:{commitment_hash}:{timestamp.isoformat()}".encode()
            ).hexdigest()

            block_num = len(self._mock_ledger) + 1
            block_timestamp = datetime.utcnow()

            # Store in mock ledger
            self._mock_ledger[tx_id] = {
                "type": "ballot_commitment",
                "data": tx_data["args"],
                "blockNumber": block_num,
                "timestamp": block_timestamp.isoformat(),
            }

            return {
                "txId": tx_id,
                "blockNumber": block_num,
                "timestamp": block_timestamp,
                "status": "COMMITTED",
            }

        except Exception as e:
            raise FabricGatewayError(f"Failed to submit ballot commitment: {e}")

    async def verify_ballot_commitment(
        self,
        tx_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Verify a ballot commitment exists on the blockchain.

        Returns the stored commitment data if found, None otherwise.
        """
        if not self._connected:
            await self.connect()

        try:
            # In production: Query chaincode
            # contract = network.get_contract(self.chaincode)
            # result = await contract.evaluate_transaction(
            #     "GetBallotCommitment",
            #     tx_id,
            # )

            # For development: Check mock ledger
            if tx_id in self._mock_ledger:
                entry = self._mock_ledger[tx_id]
                if entry["type"] == "ballot_commitment":
                    return entry["data"]

            return None

        except Exception as e:
            raise FabricGatewayError(f"Failed to verify ballot commitment: {e}")

    async def anchor_audit_log(
        self,
        log_entries: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Anchor a batch of audit log entries to the blockchain.

        This creates a merkle root of the log entries and stores it
        on-chain, providing tamper-evidence for the entire batch.
        """
        if not self._connected:
            await self.connect()

        # Create merkle root of log entries
        hashes = [
            hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest()
            for entry in log_entries
        ]

        # Simple merkle tree construction
        while len(hashes) > 1:
            if len(hashes) % 2 == 1:
                hashes.append(hashes[-1])  # Duplicate last for odd count
            hashes = [
                hashlib.sha256((hashes[i] + hashes[i + 1]).encode()).hexdigest()
                for i in range(0, len(hashes), 2)
            ]

        merkle_root = hashes[0] if hashes else ""

        try:
            # In production: Submit merkle root to chaincode

            # For development: Simulate
            tx_id = hashlib.sha256(
                f"audit:{merkle_root}:{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()

            block_num = len(self._mock_ledger) + 1
            block_timestamp = datetime.utcnow()

            self._mock_ledger[tx_id] = {
                "type": "audit_anchor",
                "merkleRoot": merkle_root,
                "entryCount": len(log_entries),
                "blockNumber": block_num,
                "timestamp": block_timestamp.isoformat(),
            }

            return {
                "txId": tx_id,
                "merkleRoot": merkle_root,
                "blockNumber": block_num,
                "timestamp": block_timestamp,
                "entryCount": len(log_entries),
            }

        except Exception as e:
            raise FabricGatewayError(f"Failed to anchor audit log: {e}")

    async def submit_election_result(
        self,
        election_id: str,
        result_hash: str,
        tallies: Dict[str, int],
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Submit certified election results to the blockchain.

        This creates an immutable record of the final tallies,
        allowing anyone to verify the results weren't altered.
        """
        if not self._connected:
            await self.connect()

        try:
            # Create result certification
            certification = {
                "electionId": election_id,
                "resultHash": result_hash,
                "tallies": tallies,
                "metadata": metadata,
                "certifiedAt": datetime.utcnow().isoformat(),
            }

            # In production: Submit to chaincode

            # For development: Simulate
            tx_id = hashlib.sha256(
                f"result:{election_id}:{result_hash}".encode()
            ).hexdigest()

            block_num = len(self._mock_ledger) + 1
            block_timestamp = datetime.utcnow()

            self._mock_ledger[tx_id] = {
                "type": "election_result",
                "data": certification,
                "blockNumber": block_num,
                "timestamp": block_timestamp.isoformat(),
            }

            return {
                "txId": tx_id,
                "blockNumber": block_num,
                "timestamp": block_timestamp,
                "status": "CERTIFIED",
            }

        except Exception as e:
            raise FabricGatewayError(f"Failed to submit election result: {e}")

    async def get_election_results(
        self,
        election_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Query certified election results from the blockchain.
        """
        if not self._connected:
            await self.connect()

        try:
            # In production: Query chaincode

            # For development: Search mock ledger
            for tx_id, entry in self._mock_ledger.items():
                if (
                    entry.get("type") == "election_result"
                    and entry.get("data", {}).get("electionId") == election_id
                ):
                    return {
                        "txId": tx_id,
                        **entry,
                    }

            return None

        except Exception as e:
            raise FabricGatewayError(f"Failed to get election results: {e}")

    async def get_ballot_history(
        self,
        election_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get history of ballot commitments for an election.

        This allows observers to verify all submitted ballots.
        """
        if not self._connected:
            await self.connect()

        try:
            # In production: Query chaincode with pagination

            # For development: Filter mock ledger
            ballots = [
                {"txId": tx_id, **entry}
                for tx_id, entry in self._mock_ledger.items()
                if (
                    entry.get("type") == "ballot_commitment"
                    and entry.get("data", {}).get("electionId") == election_id
                )
            ]

            # Sort by block number
            ballots.sort(key=lambda x: x.get("blockNumber", 0))

            return ballots[offset : offset + limit]

        except Exception as e:
            raise FabricGatewayError(f"Failed to get ballot history: {e}")


# Global fabric client instance
_fabric_client: Optional[FabricClient] = None


def get_fabric_client() -> FabricClient:
    """Get or create the global Fabric client instance."""
    global _fabric_client
    if _fabric_client is None:
        _fabric_client = FabricClient()
    return _fabric_client


async def anchor_ballot_to_blockchain(
    election_id: str,
    ballot_id: str,
    commitment_hash: str,
) -> Dict[str, Any]:
    """
    Convenience function to anchor a ballot commitment.

    Returns blockchain transaction details.
    """
    client = get_fabric_client()
    result = await client.submit_ballot_commitment(
        election_id=election_id,
        ballot_id=ballot_id,
        commitment_hash=commitment_hash,
        timestamp=datetime.utcnow(),
    )
    return result


async def verify_ballot_on_blockchain(tx_id: str) -> Optional[Dict[str, Any]]:
    """
    Convenience function to verify a ballot commitment.
    """
    client = get_fabric_client()
    return await client.verify_ballot_commitment(tx_id)
