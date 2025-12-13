"""
Cryptographic services for vote anonymity and ballot integrity.

This module provides:
- Vote token generation (for anonymous ballot submission)
- Ballot encryption (AES-256-GCM)
- Commitment hashing (for verifiability)
- Key derivation (for election-specific encryption)

SECURITY NOTES:
- All secrets use cryptographically secure random generation
- Encryption uses authenticated encryption (GCM mode)
- Commitment scheme prevents vote content leakage
- No voter-identifying information included in commitments
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
from typing import Any, Dict, List, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend


# Master encryption key - in production, this should come from HSM or Vault
MASTER_KEY = os.environ.get("ELECTION_MASTER_KEY", secrets.token_hex(32))


def generate_vote_token() -> Tuple[str, str]:
    """
    Generate a secure vote token and its hash.

    Returns:
        Tuple of (raw_token, token_hash)
        - raw_token: Given to voter, used to submit ballot
        - token_hash: Stored in database, used for lookup
    """
    raw_token = secrets.token_hex(32)  # 256 bits
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, token_hash


def hash_vote_token(token: str) -> str:
    """Hash a vote token for database lookup."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_commitment_salt() -> str:
    """Generate a random salt for ballot commitment."""
    return base64.b64encode(secrets.token_bytes(32)).decode()


def derive_election_key(election_id: str) -> bytes:
    """
    Derive an election-specific encryption key.

    In production, this should use an HSM or key management service.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits for AES-256
        salt=election_id.encode(),
        iterations=100000,
        backend=default_backend(),
    )
    return kdf.derive(MASTER_KEY.encode())


def encrypt_ballot_selections(
    selections: List[Dict[str, Any]],
    election_id: str,
) -> Dict[str, str]:
    """
    Encrypt ballot selections using AES-256-GCM.

    This provides:
    - Confidentiality: Vote content is hidden
    - Integrity: Tampering is detected via auth tag
    - Authenticity: Only authorized parties can decrypt

    Returns:
        Dict with encrypted data, IV, and auth tag
    """
    # Derive election-specific key
    key = derive_election_key(election_id)

    # Generate random IV (96 bits recommended for GCM)
    iv = secrets.token_bytes(12)

    # Serialize selections
    plaintext = json.dumps(selections, sort_keys=True).encode()

    # Encrypt with AES-256-GCM
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext, None)

    # GCM appends auth tag to ciphertext, extract it
    # Last 16 bytes are the auth tag
    encrypted = ciphertext[:-16]
    auth_tag = ciphertext[-16:]

    return {
        "encrypted": base64.b64encode(encrypted).decode(),
        "iv": base64.b64encode(iv).decode(),
        "authTag": base64.b64encode(auth_tag).decode(),
    }


def decrypt_ballot_selections(
    encrypted_data: Dict[str, str],
    election_id: str,
) -> List[Dict[str, Any]]:
    """
    Decrypt ballot selections.

    Used during tallying when authorized.
    """
    key = derive_election_key(election_id)

    encrypted = base64.b64decode(encrypted_data["encrypted"])
    iv = base64.b64decode(encrypted_data["iv"])
    auth_tag = base64.b64decode(encrypted_data["authTag"])

    # Reconstruct ciphertext with auth tag
    ciphertext = encrypted + auth_tag

    # Decrypt
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext, None)

    return json.loads(plaintext.decode())


def create_ballot_commitment(
    election_id: str,
    encrypted_ballot: str,
    salt: str,
    timestamp: int,
) -> str:
    """
    Create a cryptographic commitment for a ballot.

    The commitment allows voters to verify their vote was recorded
    without revealing vote content. The commitment is:

    H(encrypted_ballot || salt || election_id || timestamp)

    SECURITY: No voter-identifying information is included.
    """
    payload = f"{encrypted_ballot}|{salt}|{election_id}|{timestamp}"
    return hashlib.sha256(payload.encode()).hexdigest()


def verify_ballot_commitment(
    commitment: str,
    election_id: str,
    encrypted_ballot: str,
    salt: str,
    timestamp: int,
) -> bool:
    """
    Verify a ballot commitment matches expected value.

    Uses constant-time comparison to prevent timing attacks.
    """
    expected = create_ballot_commitment(election_id, encrypted_ballot, salt, timestamp)
    return hmac.compare_digest(commitment, expected)


def create_voter_receipt(
    commitment_hash: str,
    timestamp: int,
    election_id: str,
) -> str:
    """
    Create a short receipt code for voter verification.

    This is a human-friendly code that voters can use to verify
    their vote was recorded, without revealing vote content.
    """
    payload = f"{commitment_hash}|{timestamp}|{election_id}"
    full_hash = hashlib.sha256(payload.encode()).hexdigest()
    # Return first 16 characters, uppercase for readability
    return full_hash[:16].upper()


def hash_voter_pii(
    identifier: str,
    election_id: str,
) -> str:
    """
    Create a one-way hash of voter PII for the voter allowlist.

    This ensures voter identity is protected even if database is compromised.
    Uses HMAC with election-specific key to prevent rainbow table attacks.
    """
    key = derive_election_key(election_id)
    return hmac.new(key, identifier.encode(), hashlib.sha256).hexdigest()


def create_audit_chain_hash(
    previous_hash: str,
    action: str,
    resource: str,
    resource_id: str,
    timestamp: str,
    details: Dict[str, Any],
) -> str:
    """
    Create a hash chain entry for audit logs.

    This provides tamper-evidence: if any log is modified,
    all subsequent hashes will be invalid.
    """
    payload = json.dumps({
        "previousHash": previous_hash or "",
        "action": action,
        "resource": resource,
        "resourceId": resource_id or "",
        "timestamp": timestamp,
        "details": details or {},
    }, sort_keys=True)

    return hashlib.sha256(payload.encode()).hexdigest()
