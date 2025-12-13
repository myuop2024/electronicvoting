"""
Email service for ObserverNet Election Platform.

Supports multiple providers:
- AWS SES (production)
- SendGrid (alternative)
- SMTP (development/self-hosted)

Email types:
- Password reset
- Email verification
- Election notifications
- Vote confirmation
- Observer invitations
"""

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..config.settings import settings


@dataclass
class EmailMessage:
    """Email message structure."""
    to: str
    subject: str
    html_body: str
    text_body: Optional[str] = None
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[str]] = None


class EmailProvider(ABC):
    """Abstract base class for email providers."""

    @abstractmethod
    async def send(self, message: EmailMessage) -> Dict[str, Any]:
        """Send an email message."""
        pass

    @abstractmethod
    async def send_bulk(self, messages: List[EmailMessage]) -> List[Dict[str, Any]]:
        """Send multiple email messages."""
        pass


class SESEmailProvider(EmailProvider):
    """AWS SES email provider."""

    def __init__(self):
        try:
            import boto3
            self.client = boto3.client(
                'ses',
                region_name=os.environ.get('AWS_REGION', 'us-east-1'),
            )
        except ImportError:
            self.client = None

    async def send(self, message: EmailMessage) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("boto3 not installed")

        response = self.client.send_email(
            Source=message.from_email or os.environ.get('EMAIL_FROM', 'noreply@observernet.org'),
            Destination={
                'ToAddresses': [message.to],
                'CcAddresses': message.cc or [],
                'BccAddresses': message.bcc or [],
            },
            Message={
                'Subject': {'Data': message.subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': message.html_body, 'Charset': 'UTF-8'},
                    'Text': {'Data': message.text_body or '', 'Charset': 'UTF-8'},
                },
            },
            ReplyToAddresses=[message.reply_to] if message.reply_to else [],
            Tags=[{'Name': tag, 'Value': 'true'} for tag in (message.tags or [])],
        )

        return {
            'messageId': response['MessageId'],
            'status': 'sent',
        }

    async def send_bulk(self, messages: List[EmailMessage]) -> List[Dict[str, Any]]:
        results = []
        for msg in messages:
            try:
                result = await self.send(msg)
                results.append(result)
            except Exception as e:
                results.append({'status': 'error', 'error': str(e)})
        return results


class SMTPEmailProvider(EmailProvider):
    """SMTP email provider for development/self-hosted."""

    def __init__(self):
        import smtplib
        self.host = os.environ.get('SMTP_HOST', 'localhost')
        self.port = int(os.environ.get('SMTP_PORT', '587'))
        self.username = os.environ.get('SMTP_USERNAME')
        self.password = os.environ.get('SMTP_PASSWORD')
        self.use_tls = os.environ.get('SMTP_TLS', 'true').lower() == 'true'

    async def send(self, message: EmailMessage) -> Dict[str, Any]:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart('alternative')
        msg['Subject'] = message.subject
        msg['From'] = message.from_email or os.environ.get('EMAIL_FROM', 'noreply@observernet.org')
        msg['To'] = message.to

        if message.text_body:
            msg.attach(MIMEText(message.text_body, 'plain'))
        msg.attach(MIMEText(message.html_body, 'html'))

        try:
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.sendmail(msg['From'], [message.to], msg.as_string())

            return {'status': 'sent', 'messageId': f"smtp-{datetime.utcnow().timestamp()}"}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    async def send_bulk(self, messages: List[EmailMessage]) -> List[Dict[str, Any]]:
        results = []
        for msg in messages:
            result = await self.send(msg)
            results.append(result)
        return results


class MockEmailProvider(EmailProvider):
    """Mock email provider for testing."""

    sent_emails: List[EmailMessage] = []

    async def send(self, message: EmailMessage) -> Dict[str, Any]:
        self.sent_emails.append(message)
        print(f"[MOCK EMAIL] To: {message.to}, Subject: {message.subject}")
        return {'status': 'sent', 'messageId': f"mock-{len(self.sent_emails)}"}

    async def send_bulk(self, messages: List[EmailMessage]) -> List[Dict[str, Any]]:
        results = []
        for msg in messages:
            result = await self.send(msg)
            results.append(result)
        return results


class EmailService:
    """Main email service with template support."""

    def __init__(self, provider: Optional[EmailProvider] = None):
        if provider:
            self.provider = provider
        elif settings.email_provider == 'ses':
            self.provider = SESEmailProvider()
        elif settings.email_provider == 'smtp':
            self.provider = SMTPEmailProvider()
        else:
            self.provider = MockEmailProvider()

        self.from_email = os.environ.get('EMAIL_FROM', 'noreply@observernet.org')
        self.app_url = os.environ.get('NEXT_PUBLIC_APP_URL', 'https://app.observernet.org')

    async def send_password_reset(
        self,
        to_email: str,
        reset_token: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send password reset email."""
        reset_url = f"{self.app_url}/reset-password?token={reset_token}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hello{f' {user_name}' if user_name else ''},</p>
                    <p>We received a request to reset your password for your ObserverNet account.</p>
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Password</a>
                    </p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this password reset, you can safely ignore this email.</p>
                    <p>For security, this link can only be used once.</p>
                </div>
                <div class="footer">
                    <p>ObserverNet Election Platform</p>
                    <p>This is an automated message. Please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Password Reset Request

        Hello{f' {user_name}' if user_name else ''},

        We received a request to reset your password for your ObserverNet account.

        Click this link to reset your password:
        {reset_url}

        This link will expire in 1 hour.

        If you didn't request this password reset, you can safely ignore this email.

        ObserverNet Election Platform
        """

        message = EmailMessage(
            to=to_email,
            subject="Reset Your Password - ObserverNet",
            html_body=html_body,
            text_body=text_body,
            from_email=self.from_email,
            tags=['password-reset'],
        )

        return await self.provider.send(message)

    async def send_email_verification(
        self,
        to_email: str,
        verification_token: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send email verification link."""
        verify_url = f"{self.app_url}/verify-email?token={verification_token}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verify Your Email</h1>
                </div>
                <div class="content">
                    <p>Hello{f' {user_name}' if user_name else ''},</p>
                    <p>Welcome to ObserverNet! Please verify your email address to complete your registration.</p>
                    <p style="text-align: center;">
                        <a href="{verify_url}" class="button">Verify Email</a>
                    </p>
                    <p>This link will expire in 24 hours.</p>
                </div>
                <div class="footer">
                    <p>ObserverNet Election Platform</p>
                </div>
            </div>
        </body>
        </html>
        """

        message = EmailMessage(
            to=to_email,
            subject="Verify Your Email - ObserverNet",
            html_body=html_body,
            from_email=self.from_email,
            tags=['email-verification'],
        )

        return await self.provider.send(message)

    async def send_vote_confirmation(
        self,
        to_email: str,
        election_name: str,
        receipt_code: str,
        commitment_hash: str,
    ) -> Dict[str, Any]:
        """Send vote confirmation with receipt."""
        verify_url = f"{self.app_url}/verify-vote?hash={commitment_hash}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .receipt {{ background: white; border: 2px dashed #22c55e; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }}
                .receipt-code {{ font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; }}
                .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your Vote Has Been Recorded</h1>
                </div>
                <div class="content">
                    <p>Thank you for participating in <strong>{election_name}</strong>.</p>
                    <p>Your vote has been securely recorded and anchored to the blockchain.</p>

                    <div class="receipt">
                        <p>Your Receipt Code</p>
                        <p class="receipt-code">{receipt_code}</p>
                        <p style="font-size: 12px; color: #64748b;">Save this code to verify your vote later</p>
                    </div>

                    <p style="text-align: center;">
                        <a href="{verify_url}" class="button">Verify Your Vote</a>
                    </p>

                    <p style="font-size: 12px; color: #64748b;">
                        <strong>Privacy Note:</strong> Your vote content is encrypted and cannot be seen by anyone,
                        including election administrators. The receipt code only proves your vote was recorded,
                        not how you voted.
                    </p>
                </div>
                <div class="footer">
                    <p>ObserverNet Election Platform</p>
                </div>
            </div>
        </body>
        </html>
        """

        message = EmailMessage(
            to=to_email,
            subject=f"Vote Confirmed - {election_name}",
            html_body=html_body,
            from_email=self.from_email,
            tags=['vote-confirmation'],
        )

        return await self.provider.send(message)

    async def send_election_notification(
        self,
        to_email: str,
        election_name: str,
        message_type: str,
        details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Send election-related notifications."""
        subjects = {
            'election_starting': f"Voting Opens Soon - {election_name}",
            'election_started': f"Voting is Now Open - {election_name}",
            'election_ending': f"Voting Closes Soon - {election_name}",
            'election_ended': f"Voting Has Closed - {election_name}",
            'results_published': f"Results Available - {election_name}",
        }

        subject = subjects.get(message_type, f"Election Update - {election_name}")

        # Build HTML based on message type
        content = details.get('content', '')
        action_url = details.get('action_url', f"{self.app_url}/elections")
        action_text = details.get('action_text', 'View Election')

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{election_name}</h1>
                </div>
                <div class="content">
                    {content}
                    <p style="text-align: center;">
                        <a href="{action_url}" class="button">{action_text}</a>
                    </p>
                </div>
                <div class="footer">
                    <p>ObserverNet Election Platform</p>
                </div>
            </div>
        </body>
        </html>
        """

        message = EmailMessage(
            to=to_email,
            subject=subject,
            html_body=html_body,
            from_email=self.from_email,
            tags=['election-notification', message_type],
        )

        return await self.provider.send(message)


# Global email service instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create the global email service instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
