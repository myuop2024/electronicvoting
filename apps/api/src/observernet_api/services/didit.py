from __future__ import annotations

import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Dict, Any, Optional

from ..config.settings import settings


@dataclass
class DiditSession:
    session_id: str
    url: str
    status: str


@dataclass
class DiditWebhookPayload:
    """Parsed and verified Didit webhook payload."""
    session_id: str
    subject_id: str
    status: str
    verified_at: Optional[str] = None
    verification_level: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None


class DiditClient:
    """
    Client for Didit.me identity verification service.

    Handles:
    - Session creation for user verification flows
    - Webhook signature verification (HMAC-SHA256)
    - Verification status checks
    """

    def __init__(self):
        self._base_url = "https://api.didit.me/v1"
        self._api_key = settings.didit_api_key
        self._webhook_secret = settings.didit_webhook_secret

    async def create_session(
        self,
        subject_id: str,
        redirect_url: Optional[str] = None,
        verification_level: str = "standard",
    ) -> DiditSession:
        """
        Create a Didit verification session.

        Args:
            subject_id: Unique identifier for the user (e.g., email hash)
            redirect_url: URL to redirect after verification
            verification_level: Level of verification ("basic", "standard", "enhanced")

        Returns:
            DiditSession with session_id, verification URL, and status
        """
        payload = {
            "subjectId": subject_id,
            "redirectUrl": redirect_url or f"{settings.app_base_url}/verify/completed",
            "verificationLevel": verification_level,
        }

        # TODO: In production, make actual API call to Didit
        # Example:
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"{self._base_url}/sessions",
        #         json=payload,
        #         headers={"Authorization": f"Bearer {self._api_key}"}
        #     )
        #     data = response.json()

        # Stubbed response for development
        response = {
            "session_id": f"sess_{hashlib.sha256(subject_id.encode()).hexdigest()[:16]}",
            "url": f"https://verify.didit.me/session/sess_demo_{subject_id[:8]}",
            "status": "created",
        }

        return DiditSession(**response)

    async def verify_webhook_signature(
        self,
        signature: str,
        payload: bytes,
        timestamp: Optional[str] = None,
        tolerance: int = 300,
    ) -> bool:
        """
        Verify webhook signature using HMAC-SHA256.

        This prevents unauthorized webhook calls by verifying that the payload
        was signed with the shared webhook secret.

        Args:
            signature: Signature from X-Didit-Signature header
            payload: Raw webhook payload bytes
            timestamp: Optional timestamp from X-Didit-Timestamp header
            tolerance: Maximum age of webhook in seconds (default 5 minutes)

        Returns:
            True if signature is valid, False otherwise

        Security:
        - Uses HMAC-SHA256 with webhook secret
        - Supports timestamp validation to prevent replay attacks
        - Constant-time comparison to prevent timing attacks
        """
        if not signature or not payload:
            return False

        if not self._webhook_secret:
            # In development, if no webhook secret is configured, log a warning
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                "Didit webhook secret not configured - skipping signature verification. "
                "Set DIDIT_WEBHOOK_SECRET in production!"
            )
            return True  # Allow in development

        # Validate timestamp if provided (replay attack prevention)
        if timestamp:
            try:
                webhook_time = int(timestamp)
                current_time = int(time.time())
                age = abs(current_time - webhook_time)

                if age > tolerance:
                    # Webhook is too old or from the future
                    return False
            except (ValueError, TypeError):
                # Invalid timestamp format
                return False

        # Compute expected signature
        # Standard format: HMAC-SHA256(secret, payload)
        # Some providers use: HMAC-SHA256(secret, timestamp + payload)
        if timestamp:
            signed_payload = timestamp.encode() + b"." + payload
        else:
            signed_payload = payload

        expected_signature = hmac.new(
            self._webhook_secret.encode(),
            signed_payload,
            hashlib.sha256
        ).hexdigest()

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(signature, expected_signature)

    def parse_webhook_payload(self, payload: Dict[str, Any]) -> DiditWebhookPayload:
        """
        Parse and validate webhook payload structure.

        Args:
            payload: JSON webhook payload

        Returns:
            Parsed DiditWebhookPayload

        Raises:
            ValueError: If payload is missing required fields
        """
        required_fields = ["session_id", "subject_id", "status"]
        for field in required_fields:
            if field not in payload:
                raise ValueError(f"Missing required field: {field}")

        return DiditWebhookPayload(
            session_id=payload["session_id"],
            subject_id=payload["subject_id"],
            status=payload["status"],
            verified_at=payload.get("verified_at"),
            verification_level=payload.get("verification_level"),
            attributes=payload.get("attributes"),
        )
