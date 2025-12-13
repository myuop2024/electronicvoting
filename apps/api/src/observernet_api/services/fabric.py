"""
Hyperledger Fabric integration service.

This module provides:
- Ballot commitment submission to blockchain
- Transaction verification
- Audit log anchoring (Merkle roots)
- Result certification

The blockchain provides:
- Immutability: Once recorded, votes cannot be altered
- Transparency: Anyone can verify the ledger
- Decentralization: No single point of trust

ARCHITECTURE:
- Ballot commitments (not vote content) are stored on-chain
- Decryption keys are released only after voting closes
- Results can be independently verified by any observer

Based on:
- IBM/evote patterns for commitment anchoring
- Hyperledger fabric-gateway SDK for Python
"""

import asyncio
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..config.settings import settings

# Try to import Fabric Gateway SDK
try:
    from grpc import aio as grpc_aio
    from cryptography.hazmat.primitives import serialization
    from cryptography.x509 import load_pem_x509_certificate
    HAS_FABRIC_SDK = True
except ImportError:
    HAS_FABRIC_SDK = False


class FabricGatewayError(Exception):
    """Error communicating with Fabric gateway."""

    def __init__(self, message: str, tx_id: str = None, details: Dict = None):
        super().__init__(message)
        self.tx_id = tx_id
        self.details = details or {}


class FabricIdentity:
    """Represents a Fabric network identity with certificate and private key."""

    def __init__(self, msp_id: str, cert_path: str, key_path: str):
        self.msp_id = msp_id
        self.cert_path = Path(cert_path)
        self.key_path = Path(key_path)
        self._certificate = None
        self._private_key = None

    def load(self) -> Tuple[bytes, bytes]:
        """Load certificate and private key from files."""
        if not self._certificate:
            with open(self.cert_path, 'rb') as f:
                self._certificate = f.read()
        if not self._private_key:
            with open(self.key_path, 'rb') as f:
                self._private_key = f.read()
        return self._certificate, self._private_key


class MockLedger:
    """In-memory mock ledger for development and testing."""

    def __init__(self):
        self._entries: Dict[str, Any] = {}
        self._block_height = 0

    def add_entry(self, entry_type: str, data: Dict) -> Dict[str, Any]:
        """Add entry to mock ledger and return transaction details."""
        self._block_height += 1
        tx_id = hashlib.sha256(
            f"{entry_type}:{json.dumps(data, sort_keys=True)}:{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()

        block_timestamp = datetime.utcnow()

        self._entries[tx_id] = {
            "type": entry_type,
            "data": data,
            "blockNumber": self._block_height,
            "timestamp": block_timestamp.isoformat(),
        }

        return {
            "txId": tx_id,
            "blockNumber": self._block_height,
            "timestamp": block_timestamp,
            "status": "COMMITTED",
        }

    def get_entry(self, tx_id: str) -> Optional[Dict]:
        """Get entry by transaction ID."""
        return self._entries.get(tx_id)

    def query(self, entry_type: str = None, filter_fn: callable = None) -> List[Dict]:
        """Query entries with optional type and filter."""
        results = []
        for tx_id, entry in self._entries.items():
            if entry_type and entry.get("type") != entry_type:
                continue
            if filter_fn and not filter_fn(entry):
                continue
            results.append({"txId": tx_id, **entry})
        return results

    @property
    def block_height(self) -> int:
        return self._block_height


class FabricClient:
    """
    Hyperledger Fabric client for election operations.

    Supports both production mode (real Fabric Gateway) and
    development mode (in-memory mock ledger).

    Production configuration via environment:
    - FABRIC_GATEWAY_URL: Gateway gRPC endpoint
    - FABRIC_MSP_ID: Organization MSP ID
    - FABRIC_CHANNEL: Channel name
    - FABRIC_CHAINCODE: Chaincode name
    - FABRIC_CERT_PATH: Path to user certificate
    - FABRIC_KEY_PATH: Path to private key
    - FABRIC_TLS_CERT_PATH: Path to TLS CA certificate
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
        self._gateway = None
        self._network = None
        self._contract = None

        # Mock ledger for development
        self._mock_ledger = MockLedger()
        self._use_mock = self.gateway_url == "mock" or not HAS_FABRIC_SDK

    @property
    def is_mock_mode(self) -> bool:
        """Check if client is using mock ledger."""
        return self._use_mock

    async def connect(self) -> bool:
        """
        Establish connection to Fabric gateway.

        In production, initializes gRPC connection with mTLS.
        In development, uses mock ledger.
        """
        if self._connected:
            return True

        if self._use_mock:
            print("Fabric client running in MOCK mode")
            self._connected = True
            return True

        try:
            # Production: Connect to real Fabric Gateway
            cert_path = os.getenv("FABRIC_CERT_PATH")
            key_path = os.getenv("FABRIC_KEY_PATH")
            tls_cert_path = os.getenv("FABRIC_TLS_CERT_PATH")

            if not all([cert_path, key_path]):
                raise FabricGatewayError(
                    "Missing FABRIC_CERT_PATH or FABRIC_KEY_PATH environment variables"
                )

            # Load identity
            identity = FabricIdentity(self.msp_id, cert_path, key_path)
            cert_bytes, key_bytes = identity.load()

            # Create gRPC channel with TLS
            if tls_cert_path:
                with open(tls_cert_path, 'rb') as f:
                    tls_cert = f.read()
                credentials = grpc_aio.ssl_channel_credentials(
                    root_certificates=tls_cert
                )
                channel = grpc_aio.secure_channel(self.gateway_url, credentials)
            else:
                channel = grpc_aio.insecure_channel(self.gateway_url)

            # Store connection info
            self._grpc_channel = channel
            self._identity = {
                "mspId": self.msp_id,
                "certificate": cert_bytes,
                "privateKey": key_bytes,
            }

            self._connected = True
            print(f"Connected to Fabric Gateway at {self.gateway_url}")
            return True

        except Exception as e:
            raise FabricGatewayError(f"Failed to connect to Fabric: {e}")

    async def disconnect(self):
        """Close connection to Fabric gateway."""
        if hasattr(self, '_grpc_channel') and self._grpc_channel:
            await self._grpc_channel.close()
        self._connected = False
        self._gateway = None
        self._network = None
        self._contract = None

    async def _invoke_chaincode(
        self,
        function: str,
        args: List[str],
        transient: Dict[str, bytes] = None,
    ) -> bytes:
        """
        Invoke chaincode function (submit transaction).

        In production, this submits to the real network.
        """
        if self._use_mock:
            # Mock mode: return simulated response
            return json.dumps({
                "success": True,
                "function": function,
                "args": args,
            }).encode()

        # Production: Use Fabric Gateway to submit transaction
        # This is where fabric-gateway SDK would be used
        # For now, we'll use the mock mode pattern
        raise NotImplementedError(
            "Production chaincode invocation requires fabric-gateway SDK. "
            "Set FABRIC_GATEWAY_URL=mock for development."
        )

    async def _query_chaincode(
        self,
        function: str,
        args: List[str],
    ) -> bytes:
        """
        Query chaincode function (evaluate transaction).

        Queries don't modify the ledger.
        """
        if self._use_mock:
            return json.dumps({
                "success": True,
                "function": function,
                "args": args,
            }).encode()

        raise NotImplementedError(
            "Production chaincode query requires fabric-gateway SDK."
        )

    # =========================================================================
    # BALLOT COMMITMENT OPERATIONS
    # =========================================================================

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

        Creates an immutable record that the ballot was submitted
        at a specific time with a specific commitment hash.

        The commitment hash is H(encrypted_ballot || salt || timestamp).
        It doesn't reveal the vote, but allows verification that
        the ballot wasn't altered.

        Args:
            election_id: Election identifier
            ballot_id: Unique ballot identifier
            commitment_hash: SHA-256 hash of encrypted ballot + salt
            timestamp: Submission timestamp
            metadata: Optional additional data (channel, region, etc.)

        Returns:
            Dict with txId, blockNumber, timestamp, status
        """
        if not self._connected:
            await self.connect()

        tx_data = {
            "electionId": election_id,
            "ballotId": ballot_id,
            "commitmentHash": commitment_hash,
            "timestamp": timestamp.isoformat(),
            "metadata": metadata or {},
        }

        try:
            if self._use_mock:
                return self._mock_ledger.add_entry("ballot_commitment", tx_data)

            # Production: Submit to chaincode
            result = await self._invoke_chaincode(
                "SubmitBallotCommitment",
                [
                    election_id,
                    ballot_id,
                    commitment_hash,
                    timestamp.isoformat(),
                    json.dumps(metadata or {}),
                ],
            )

            response = json.loads(result)
            return {
                "txId": response.get("txId"),
                "blockNumber": response.get("blockNumber"),
                "timestamp": datetime.fromisoformat(response.get("timestamp")),
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
        This allows voters to verify their ballot was recorded.
        """
        if not self._connected:
            await self.connect()

        try:
            if self._use_mock:
                entry = self._mock_ledger.get_entry(tx_id)
                if entry and entry.get("type") == "ballot_commitment":
                    return {
                        "valid": True,
                        "txId": tx_id,
                        **entry,
                    }
                return None

            # Production: Query chaincode
            result = await self._query_chaincode(
                "GetBallotCommitment",
                [tx_id],
            )

            if not result:
                return None

            return json.loads(result)

        except Exception as e:
            raise FabricGatewayError(f"Failed to verify ballot commitment: {e}")

    async def get_ballot_by_commitment(
        self,
        election_id: str,
        commitment_hash: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Find a ballot by its commitment hash.

        Useful for receipt verification.
        """
        if not self._connected:
            await self.connect()

        try:
            if self._use_mock:
                results = self._mock_ledger.query(
                    "ballot_commitment",
                    lambda e: (
                        e.get("data", {}).get("electionId") == election_id and
                        e.get("data", {}).get("commitmentHash") == commitment_hash
                    )
                )
                return results[0] if results else None

            # Production: Query chaincode
            result = await self._query_chaincode(
                "GetBallotByCommitment",
                [election_id, commitment_hash],
            )

            return json.loads(result) if result else None

        except Exception as e:
            raise FabricGatewayError(f"Failed to get ballot by commitment: {e}")

    # =========================================================================
    # AUDIT LOG OPERATIONS
    # =========================================================================

    async def anchor_audit_log(
        self,
        log_entries: List[Dict[str, Any]],
        election_id: str = None,
    ) -> Dict[str, Any]:
        """
        Anchor a batch of audit log entries to the blockchain.

        Creates a Merkle root of the log entries and stores it on-chain,
        providing tamper-evidence for the entire batch.

        This is more efficient than storing each log entry individually.

        Args:
            log_entries: List of audit log dictionaries
            election_id: Optional election context

        Returns:
            Dict with txId, merkleRoot, blockNumber, entryCount
        """
        if not self._connected:
            await self.connect()

        if not log_entries:
            raise ValueError("Cannot anchor empty log entries")

        # Create Merkle tree
        hashes = [
            hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest()
            for entry in log_entries
        ]

        # Build Merkle root
        level = hashes.copy()
        while len(level) > 1:
            if len(level) % 2 == 1:
                level.append(level[-1])  # Duplicate last for odd count
            level = [
                hashlib.sha256((level[i] + level[i + 1]).encode()).hexdigest()
                for i in range(0, len(level), 2)
            ]

        merkle_root = level[0]

        try:
            tx_data = {
                "merkleRoot": merkle_root,
                "entryCount": len(log_entries),
                "electionId": election_id,
                "anchoredAt": datetime.utcnow().isoformat(),
            }

            if self._use_mock:
                result = self._mock_ledger.add_entry("audit_anchor", tx_data)
                result["merkleRoot"] = merkle_root
                result["entryCount"] = len(log_entries)
                return result

            # Production: Submit to chaincode
            result = await self._invoke_chaincode(
                "AnchorAuditLog",
                [merkle_root, str(len(log_entries)), election_id or ""],
            )

            response = json.loads(result)
            return {
                "txId": response.get("txId"),
                "merkleRoot": merkle_root,
                "blockNumber": response.get("blockNumber"),
                "timestamp": datetime.fromisoformat(response.get("timestamp")),
                "entryCount": len(log_entries),
            }

        except Exception as e:
            raise FabricGatewayError(f"Failed to anchor audit log: {e}")

    async def verify_audit_anchor(
        self,
        tx_id: str,
        log_entries: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Verify audit log entries match their blockchain anchor.

        Recomputes Merkle root and compares with stored value.
        """
        if not self._connected:
            await self.connect()

        # Recompute Merkle root
        hashes = [
            hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest()
            for entry in log_entries
        ]

        level = hashes.copy()
        while len(level) > 1:
            if len(level) % 2 == 1:
                level.append(level[-1])
            level = [
                hashlib.sha256((level[i] + level[i + 1]).encode()).hexdigest()
                for i in range(0, len(level), 2)
            ]

        computed_root = level[0] if level else ""

        try:
            if self._use_mock:
                entry = self._mock_ledger.get_entry(tx_id)
                if not entry or entry.get("type") != "audit_anchor":
                    return {"valid": False, "error": "Anchor not found"}

                stored_root = entry.get("data", {}).get("merkleRoot")
                return {
                    "valid": computed_root == stored_root,
                    "computedRoot": computed_root,
                    "storedRoot": stored_root,
                    "txId": tx_id,
                }

            # Production: Query and compare
            result = await self._query_chaincode("GetAuditAnchor", [tx_id])
            stored = json.loads(result)

            return {
                "valid": computed_root == stored.get("merkleRoot"),
                "computedRoot": computed_root,
                "storedRoot": stored.get("merkleRoot"),
                "txId": tx_id,
            }

        except Exception as e:
            raise FabricGatewayError(f"Failed to verify audit anchor: {e}")

    # =========================================================================
    # ELECTION RESULT OPERATIONS
    # =========================================================================

    async def submit_election_result(
        self,
        election_id: str,
        result_hash: str,
        tallies: Dict[str, int],
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Submit certified election results to the blockchain.

        Creates an immutable record of the final tallies,
        allowing anyone to verify the results weren't altered.

        This should only be called after the election is closed
        and results are finalized.

        Args:
            election_id: Election identifier
            result_hash: Hash of complete result data
            tallies: Contest:Option -> vote count mapping
            metadata: Election name, dates, certifier info

        Returns:
            Dict with txId, blockNumber, status
        """
        if not self._connected:
            await self.connect()

        certification = {
            "electionId": election_id,
            "resultHash": result_hash,
            "tallies": tallies,
            "metadata": metadata,
            "certifiedAt": datetime.utcnow().isoformat(),
        }

        try:
            if self._use_mock:
                return self._mock_ledger.add_entry("election_result", certification)

            # Production: Submit to chaincode
            result = await self._invoke_chaincode(
                "SubmitElectionResult",
                [
                    election_id,
                    result_hash,
                    json.dumps(tallies),
                    json.dumps(metadata),
                ],
            )

            response = json.loads(result)
            return {
                "txId": response.get("txId"),
                "blockNumber": response.get("blockNumber"),
                "timestamp": datetime.fromisoformat(response.get("timestamp")),
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

        Returns None if results haven't been certified yet.
        """
        if not self._connected:
            await self.connect()

        try:
            if self._use_mock:
                results = self._mock_ledger.query(
                    "election_result",
                    lambda e: e.get("data", {}).get("electionId") == election_id
                )
                return results[0] if results else None

            # Production: Query chaincode
            result = await self._query_chaincode(
                "GetElectionResults",
                [election_id],
            )

            return json.loads(result) if result else None

        except Exception as e:
            raise FabricGatewayError(f"Failed to get election results: {e}")

    # =========================================================================
    # HISTORY AND STATISTICS
    # =========================================================================

    async def get_ballot_history(
        self,
        election_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get history of ballot commitments for an election.

        Allows observers to verify all submitted ballots.
        Only returns commitment hashes, not vote content.
        """
        if not self._connected:
            await self.connect()

        try:
            if self._use_mock:
                ballots = self._mock_ledger.query(
                    "ballot_commitment",
                    lambda e: e.get("data", {}).get("electionId") == election_id
                )
                ballots.sort(key=lambda x: x.get("blockNumber", 0))
                return ballots[offset:offset + limit]

            # Production: Query chaincode with pagination
            result = await self._query_chaincode(
                "GetBallotHistory",
                [election_id, str(limit), str(offset)],
            )

            return json.loads(result) if result else []

        except Exception as e:
            raise FabricGatewayError(f"Failed to get ballot history: {e}")

    async def get_network_stats(self) -> Dict[str, Any]:
        """
        Get Fabric network statistics.

        Useful for admin dashboard.
        """
        if not self._connected:
            await self.connect()

        if self._use_mock:
            return {
                "mode": "mock",
                "blockHeight": self._mock_ledger.block_height,
                "totalTransactions": len(self._mock_ledger._entries),
                "ballotCommitments": len(self._mock_ledger.query("ballot_commitment")),
                "auditAnchors": len(self._mock_ledger.query("audit_anchor")),
                "electionResults": len(self._mock_ledger.query("election_result")),
                "channel": self.channel,
                "chaincode": self.chaincode,
            }

        # Production: Query network info
        try:
            result = await self._query_chaincode("GetNetworkStats", [])
            return json.loads(result)
        except Exception:
            return {"mode": "production", "error": "Failed to get stats"}

    async def get_block_info(self, block_number: int) -> Optional[Dict[str, Any]]:
        """Get information about a specific block."""
        if not self._connected:
            await self.connect()

        if self._use_mock:
            # Find transactions in this block
            txs = [
                {"txId": tx_id, **entry}
                for tx_id, entry in self._mock_ledger._entries.items()
                if entry.get("blockNumber") == block_number
            ]

            if not txs:
                return None

            return {
                "blockNumber": block_number,
                "transactionCount": len(txs),
                "transactions": txs,
                "timestamp": txs[0].get("timestamp") if txs else None,
            }

        # Production: Query block info
        try:
            result = await self._query_chaincode("GetBlockInfo", [str(block_number)])
            return json.loads(result) if result else None
        except Exception:
            return None


# =============================================================================
# GLOBAL CLIENT AND CONVENIENCE FUNCTIONS
# =============================================================================

_fabric_client: Optional[FabricClient] = None


def get_fabric_client() -> FabricClient:
    """Get or create the global Fabric client instance."""
    global _fabric_client
    if _fabric_client is None:
        _fabric_client = FabricClient()
    return _fabric_client


def reset_fabric_client():
    """Reset the global Fabric client (for testing)."""
    global _fabric_client
    _fabric_client = None


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


async def certify_election_results(
    election_id: str,
    result_hash: str,
    tallies: Dict[str, int],
    certifier_id: str,
    election_name: str,
) -> Dict[str, Any]:
    """
    Convenience function to certify election results.
    """
    client = get_fabric_client()
    return await client.submit_election_result(
        election_id=election_id,
        result_hash=result_hash,
        tallies=tallies,
        metadata={
            "certifierId": certifier_id,
            "electionName": election_name,
            "certifiedAt": datetime.utcnow().isoformat(),
        },
    )
