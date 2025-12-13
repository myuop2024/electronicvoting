"""
SMS Notification Service.

Provides SMS delivery for:
- Access code delivery
- Vote confirmation
- Election reminders
- Two-factor authentication

Supports multiple providers:
- Twilio (production)
- Mock (development/testing)

SECURITY:
- Access codes are sent only to verified phone numbers
- SMS content never includes vote choices
- All deliveries are audit-logged
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
import os
import asyncio

from ..config.settings import settings


@dataclass
class SMSMessage:
    """Represents an SMS message."""
    to: str  # E.164 format: +1234567890
    body: str
    from_number: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class SMSResult:
    """Result of an SMS send operation."""
    success: bool
    message_id: Optional[str] = None
    status: str = "unknown"
    error: Optional[str] = None
    cost: Optional[float] = None


class SMSProvider(ABC):
    """Abstract base class for SMS providers."""

    @abstractmethod
    async def send(self, message: SMSMessage) -> SMSResult:
        """Send a single SMS message."""
        pass

    @abstractmethod
    async def send_bulk(self, messages: List[SMSMessage]) -> List[SMSResult]:
        """Send multiple SMS messages."""
        pass

    @abstractmethod
    async def check_status(self, message_id: str) -> Dict[str, Any]:
        """Check delivery status of a message."""
        pass


class MockSMSProvider(SMSProvider):
    """Mock SMS provider for development and testing."""

    def __init__(self):
        self.sent_messages: List[SMSMessage] = []
        self.message_counter = 0

    async def send(self, message: SMSMessage) -> SMSResult:
        """Store message and return success."""
        self.message_counter += 1
        message_id = f"mock_sms_{self.message_counter}"

        self.sent_messages.append(message)

        print(f"[MockSMS] To: {message.to}")
        print(f"[MockSMS] Body: {message.body}")
        print(f"[MockSMS] ID: {message_id}")

        return SMSResult(
            success=True,
            message_id=message_id,
            status="delivered",
        )

    async def send_bulk(self, messages: List[SMSMessage]) -> List[SMSResult]:
        """Send multiple messages."""
        results = []
        for msg in messages:
            result = await self.send(msg)
            results.append(result)
        return results

    async def check_status(self, message_id: str) -> Dict[str, Any]:
        """Return mock status."""
        return {
            "message_id": message_id,
            "status": "delivered",
            "delivered_at": datetime.utcnow().isoformat(),
        }

    def get_sent_messages(self) -> List[SMSMessage]:
        """Get all sent messages (for testing)."""
        return self.sent_messages.copy()

    def clear(self):
        """Clear sent messages (for testing)."""
        self.sent_messages.clear()


class TwilioSMSProvider(SMSProvider):
    """Twilio SMS provider for production."""

    def __init__(
        self,
        account_sid: str = None,
        auth_token: str = None,
        from_number: str = None,
    ):
        self.account_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = auth_token or os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = from_number or os.getenv("TWILIO_PHONE_NUMBER")

        if not all([self.account_sid, self.auth_token, self.from_number]):
            raise ValueError(
                "Twilio credentials required: TWILIO_ACCOUNT_SID, "
                "TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER"
            )

        # Import Twilio client
        try:
            from twilio.rest import Client
            self.client = Client(self.account_sid, self.auth_token)
        except ImportError:
            raise ImportError("twilio package required. Install with: pip install twilio")

    async def send(self, message: SMSMessage) -> SMSResult:
        """Send SMS via Twilio."""
        try:
            # Run in thread pool since Twilio client is synchronous
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.client.messages.create(
                    body=message.body,
                    from_=message.from_number or self.from_number,
                    to=message.to,
                )
            )

            return SMSResult(
                success=True,
                message_id=result.sid,
                status=result.status,
                cost=float(result.price) if result.price else None,
            )

        except Exception as e:
            return SMSResult(
                success=False,
                status="failed",
                error=str(e),
            )

    async def send_bulk(self, messages: List[SMSMessage]) -> List[SMSResult]:
        """Send multiple SMS messages."""
        # Twilio has rate limits, so we send sequentially with small delay
        results = []
        for msg in messages:
            result = await self.send(msg)
            results.append(result)
            await asyncio.sleep(0.1)  # Rate limit protection
        return results

    async def check_status(self, message_id: str) -> Dict[str, Any]:
        """Check message delivery status."""
        try:
            loop = asyncio.get_event_loop()
            message = await loop.run_in_executor(
                None,
                lambda: self.client.messages(message_id).fetch()
            )

            return {
                "message_id": message.sid,
                "status": message.status,
                "to": message.to,
                "from": message.from_,
                "sent_at": message.date_sent.isoformat() if message.date_sent else None,
                "error_code": message.error_code,
                "error_message": message.error_message,
            }

        except Exception as e:
            return {
                "message_id": message_id,
                "status": "unknown",
                "error": str(e),
            }


class SMSService:
    """
    High-level SMS service for election notifications.

    Provides templated messages for common scenarios.
    """

    def __init__(self, provider: SMSProvider = None):
        self.provider = provider or self._create_default_provider()

    def _create_default_provider(self) -> SMSProvider:
        """Create provider based on configuration."""
        sms_provider = os.getenv("SMS_PROVIDER", "mock")

        if sms_provider == "twilio":
            return TwilioSMSProvider()
        else:
            return MockSMSProvider()

    async def send_access_code(
        self,
        to_phone: str,
        access_code: str,
        election_name: str,
        expires_in_hours: int = 24,
    ) -> SMSResult:
        """Send access code to voter."""
        body = (
            f"Your ObserverNet access code for {election_name}: {access_code}\n\n"
            f"This code expires in {expires_in_hours} hours. "
            f"Do not share this code with anyone."
        )

        return await self.provider.send(SMSMessage(
            to=to_phone,
            body=body,
            metadata={
                "type": "access_code",
                "election": election_name,
            },
        ))

    async def send_vote_confirmation(
        self,
        to_phone: str,
        receipt_code: str,
        election_name: str,
    ) -> SMSResult:
        """Send vote confirmation to voter."""
        body = (
            f"Your vote in {election_name} has been recorded.\n\n"
            f"Receipt code: {receipt_code}\n\n"
            f"Keep this code to verify your ballot. "
            f"It does not reveal your vote choices."
        )

        return await self.provider.send(SMSMessage(
            to=to_phone,
            body=body,
            metadata={
                "type": "vote_confirmation",
                "election": election_name,
            },
        ))

    async def send_election_reminder(
        self,
        to_phone: str,
        election_name: str,
        voting_ends: datetime,
        vote_url: str,
    ) -> SMSResult:
        """Send election reminder to voter."""
        time_remaining = voting_ends - datetime.utcnow()
        hours = int(time_remaining.total_seconds() / 3600)

        body = (
            f"Reminder: {election_name} ends in {hours} hours.\n\n"
            f"Cast your vote at: {vote_url}"
        )

        return await self.provider.send(SMSMessage(
            to=to_phone,
            body=body,
            metadata={
                "type": "election_reminder",
                "election": election_name,
            },
        ))

    async def send_verification_code(
        self,
        to_phone: str,
        code: str,
        purpose: str = "login",
    ) -> SMSResult:
        """Send two-factor authentication code."""
        body = (
            f"Your ObserverNet verification code: {code}\n\n"
            f"This code expires in 10 minutes."
        )

        return await self.provider.send(SMSMessage(
            to=to_phone,
            body=body,
            metadata={
                "type": "2fa",
                "purpose": purpose,
            },
        ))

    async def send_bulk_access_codes(
        self,
        recipients: List[Dict[str, str]],
        election_name: str,
    ) -> List[SMSResult]:
        """
        Send access codes to multiple recipients.

        Args:
            recipients: List of {"phone": "+1...", "code": "ABC123"}
            election_name: Name of the election
        """
        messages = [
            SMSMessage(
                to=r["phone"],
                body=(
                    f"Your ObserverNet access code for {election_name}: {r['code']}\n\n"
                    f"Do not share this code."
                ),
                metadata={"type": "access_code", "election": election_name},
            )
            for r in recipients
        ]

        return await self.provider.send_bulk(messages)


# =============================================================================
# GLOBAL SERVICE AND FACTORY
# =============================================================================

_sms_service: Optional[SMSService] = None


def get_sms_service() -> SMSService:
    """Get or create the global SMS service instance."""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service


def reset_sms_service():
    """Reset the global SMS service (for testing)."""
    global _sms_service
    _sms_service = None
