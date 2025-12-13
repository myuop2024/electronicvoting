"""
Data Breach Notification System

Automates breach detection, notification, and compliance with regulations:
- GDPR: 72 hours to regulator
- CCPA/CPRA: Prompt notification
- LGPD: Immediate notification
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import secrets

from sqlalchemy.orm import Session
from sqlalchemy import and_

from .models import (
    BreachNotification,
    BreachSeverity,
    BreachStatus,
)
from .jurisdiction import PrivacyJurisdiction
from ..services.email import send_email

logger = logging.getLogger(__name__)


class BreachNotificationEngine:
    """
    Automated breach detection and notification engine.

    Implements multi-jurisdiction compliance:
    - GDPR Art. 33: 72 hours to supervisory authority
    - GDPR Art. 34: Prompt notification to data subjects (if high risk)
    - CCPA: Prompt notification
    - LGPD: Immediate notification to authority and subjects
    """

    # Regulatory notification deadlines
    NOTIFICATION_DEADLINES = {
        PrivacyJurisdiction.GDPR: {
            "authority": timedelta(hours=72),
            "subjects": timedelta(hours=72),  # "Without undue delay"
        },
        PrivacyJurisdiction.CCPA: {
            "authority": None,  # No specific requirement
            "subjects": timedelta(hours=48),  # Prompt
        },
        PrivacyJurisdiction.CPRA: {
            "authority": None,
            "subjects": timedelta(hours=48),
        },
        PrivacyJurisdiction.LGPD: {
            "authority": timedelta(hours=24),  # Immediate
            "subjects": timedelta(hours=24),
        },
        PrivacyJurisdiction.PIPL: {
            "authority": timedelta(hours=72),
            "subjects": timedelta(hours=72),
        },
    }

    # Supervisory authorities contact info (in production, this would be a full database)
    SUPERVISORY_AUTHORITIES = {
        PrivacyJurisdiction.GDPR: {
            "DE": {"name": "BfDI", "email": "poststelle@bfdi.bund.de"},  # Germany
            "FR": {"name": "CNIL", "email": "notifications@cnil.fr"},  # France
            "GB": {"name": "ICO", "email": "casework@ico.org.uk"},  # UK
            # Add more as needed
        },
        PrivacyJurisdiction.CCPA: {
            "US": {"name": "California AG", "email": "privacy@oag.ca.gov"},
        },
        PrivacyJurisdiction.LGPD: {
            "BR": {"name": "ANPD", "email": "anpd@gov.br"},
        },
    }

    def __init__(self, db: Session):
        """Initialize breach notification engine."""
        self.db = db

    def create_breach_notification(
        self,
        title: str,
        description: str,
        severity: BreachSeverity,
        affected_data_types: List[str],
        affected_records_count: int,
        cause_category: str,
        root_cause: Optional[str] = None,
        technical_details: Optional[str] = None,
        detected_by: Optional[str] = None,
    ) -> BreachNotification:
        """
        Create a new breach notification.

        Args:
            title: Breach title
            description: Detailed description
            severity: Severity level
            affected_data_types: Types of data affected
            affected_records_count: Number of records affected
            cause_category: Category of cause
            root_cause: Root cause description
            technical_details: Technical details
            detected_by: Who detected the breach

        Returns:
            Created breach notification
        """
        breach = BreachNotification(
            id=f"BREACH_{secrets.token_hex(12)}",
            title=title,
            description=description,
            severity=severity,
            status=BreachStatus.DETECTED,
            affectedDataTypes=affected_data_types,
            affectedRecordsCount=affected_records_count,
            detectedAt=datetime.utcnow(),
            causeCategory=cause_category,
            rootCause=root_cause,
            technicalDetails=technical_details,
            detectedBy=detected_by,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow(),
        )

        self.db.add(breach)
        self.db.commit()

        logger.critical(f"Breach notification created: {breach.id} - {title} (severity={severity})")

        return breach

    async def notify_authorities(
        self,
        breach: BreachNotification,
        jurisdictions: List[PrivacyJurisdiction],
    ) -> Dict[str, Any]:
        """
        Notify supervisory authorities of the breach.

        Args:
            breach: Breach notification
            jurisdictions: Affected jurisdictions

        Returns:
            Notification summary
        """
        logger.info(f"Notifying authorities for breach {breach.id} in jurisdictions: {jurisdictions}")

        notifications_sent = []
        errors = []

        for jurisdiction in jurisdictions:
            try:
                # Get authority contact
                authorities = self.SUPERVISORY_AUTHORITIES.get(jurisdiction, {})

                for country_code, authority in authorities.items():
                    # In production, this would use official notification channels
                    # For now, log and send email
                    logger.info(f"Notifying {authority['name']} at {authority['email']}")

                    # Prepare notification
                    notification_content = self._prepare_authority_notification(breach, jurisdiction)

                    # Send email (in production, use official portals)
                    try:
                        await send_email(
                            to=authority["email"],
                            subject=f"Data Breach Notification - {breach.id}",
                            body=notification_content,
                        )

                        notifications_sent.append({
                            "jurisdiction": jurisdiction.value,
                            "authority": authority["name"],
                            "email": authority["email"],
                            "sent_at": datetime.utcnow().isoformat(),
                        })

                    except Exception as e:
                        logger.error(f"Failed to notify {authority['name']}: {e}")
                        errors.append({
                            "authority": authority["name"],
                            "error": str(e)
                        })

            except Exception as e:
                logger.error(f"Error processing jurisdiction {jurisdiction}: {e}")
                errors.append({
                    "jurisdiction": jurisdiction.value,
                    "error": str(e)
                })

        # Update breach record
        breach.authoritiesNotifiedAt = datetime.utcnow()
        breach.authoritiesNotificationDetails = {
            "notifications": notifications_sent,
            "errors": errors,
        }
        breach.status = BreachStatus.NOTIFYING_AUTHORITIES
        self.db.commit()

        return {
            "notifications_sent": len(notifications_sent),
            "errors": len(errors),
            "details": notifications_sent,
        }

    async def notify_subjects(
        self,
        breach: BreachNotification,
        affected_emails: List[str],
    ) -> Dict[str, Any]:
        """
        Notify affected data subjects.

        Args:
            breach: Breach notification
            affected_emails: List of affected user emails

        Returns:
            Notification summary
        """
        logger.info(f"Notifying {len(affected_emails)} subjects for breach {breach.id}")

        notifications_sent = 0
        errors = []

        for email in affected_emails:
            try:
                # Prepare user-friendly notification
                notification_content = self._prepare_subject_notification(breach)

                await send_email(
                    to=email,
                    subject=f"Important Security Notice - ObserverNet Data Breach",
                    body=notification_content,
                )

                notifications_sent += 1

            except Exception as e:
                logger.error(f"Failed to notify {email}: {e}")
                errors.append({
                    "email": email,
                    "error": str(e)
                })

        # Update breach record
        breach.subjectsNotifiedAt = datetime.utcnow()
        breach.subjectsNotificationMethod = "email"
        breach.affectedUserEmails = affected_emails
        breach.status = BreachStatus.NOTIFYING_SUBJECTS
        self.db.commit()

        return {
            "notifications_sent": notifications_sent,
            "total_affected": len(affected_emails),
            "errors": len(errors),
        }

    def _prepare_authority_notification(
        self,
        breach: BreachNotification,
        jurisdiction: PrivacyJurisdiction
    ) -> str:
        """
        Prepare formal notification for supervisory authority.

        Includes all required elements per regulations.
        """
        return f"""
PERSONAL DATA BREACH NOTIFICATION

Reference: {breach.id}
Date of Detection: {breach.detectedAt.isoformat()}
Organization: ObserverNet
Data Controller Contact: dpo@observernet.org

NATURE OF THE BREACH:
{breach.description}

CATEGORIES AND APPROXIMATE NUMBER OF DATA SUBJECTS AFFECTED:
- Number of affected records: {breach.affectedRecordsCount}
- Categories of data: {', '.join(breach.affectedDataTypes)}

LIKELY CONSEQUENCES:
Severity: {breach.severity.value}
{breach.rootCause or 'Under investigation'}

MEASURES TAKEN OR PROPOSED:
{self._format_mitigation_steps(breach.mitigationSteps)}

CONTACT POINT:
Data Protection Officer: dpo@observernet.org
Technical Contact: security@observernet.org

This notification is provided in accordance with {jurisdiction.value} requirements.
For GDPR: Article 33 of Regulation (EU) 2016/679
For CCPA: California Civil Code § 1798.82
For LGPD: Lei Geral de Proteção de Dados Article 48

ObserverNet is committed to transparency and will provide updates as our investigation continues.
"""

    def _prepare_subject_notification(self, breach: BreachNotification) -> str:
        """
        Prepare user-friendly notification for affected data subjects.
        """
        return f"""
Dear ObserverNet User,

We are writing to inform you of a security incident that may have affected your personal information.

WHAT HAPPENED:
{breach.description}

WHAT INFORMATION WAS INVOLVED:
{', '.join(breach.affectedDataTypes)}

WHAT WE ARE DOING:
{self._format_mitigation_steps(breach.mitigationSteps)}

WHAT YOU CAN DO:
- Monitor your accounts for any suspicious activity
- Change your password if you used the same password on other sites
- Be cautious of phishing attempts
- Contact us if you have any concerns: privacy@observernet.org

YOUR RIGHTS:
You have the right to:
- Access your personal data
- Request correction or deletion
- Lodge a complaint with your data protection authority
- Receive more information about this incident

For more information or to exercise your rights, visit: {get_base_url()}/privacy-request

We sincerely apologize for this incident and are taking all necessary steps to prevent future occurrences.

ObserverNet Security Team
security@observernet.org

Reference: {breach.id}
"""

    def _format_mitigation_steps(self, steps: List[str]) -> str:
        """Format mitigation steps as bullet list."""
        if not steps:
            return "Investigation in progress"
        return "\n".join(f"- {step}" for step in steps)

    def check_notification_deadlines(self) -> List[Dict[str, Any]]:
        """
        Check if any breach notifications are approaching or past deadline.

        Returns:
            List of overdue/approaching breach notifications
        """
        alerts = []

        # Find breaches that haven't notified authorities yet
        breaches = self.db.query(BreachNotification).filter(
            and_(
                BreachNotification.status.in_([
                    BreachStatus.DETECTED,
                    BreachStatus.INVESTIGATING,
                    BreachStatus.CONFIRMED
                ]),
                BreachNotification.authoritiesNotifiedAt.is_(None)
            )
        ).all()

        for breach in breaches:
            for jurisdiction in breach.affectedJurisdictions or []:
                deadline_config = self.NOTIFICATION_DEADLINES.get(jurisdiction, {})
                authority_deadline = deadline_config.get("authority")

                if authority_deadline:
                    deadline = breach.detectedAt + authority_deadline
                    time_remaining = deadline - datetime.utcnow()

                    if time_remaining.total_seconds() < 0:
                        alerts.append({
                            "breach_id": breach.id,
                            "jurisdiction": jurisdiction.value,
                            "status": "OVERDUE",
                            "deadline": deadline.isoformat(),
                            "overdue_by_hours": abs(time_remaining.total_seconds() / 3600),
                        })
                    elif time_remaining.total_seconds() < 3600 * 24:  # Less than 24 hours
                        alerts.append({
                            "breach_id": breach.id,
                            "jurisdiction": jurisdiction.value,
                            "status": "APPROACHING",
                            "deadline": deadline.isoformat(),
                            "hours_remaining": time_remaining.total_seconds() / 3600,
                        })

        return alerts


def get_base_url() -> str:
    """Get application base URL."""
    from ..config.settings import settings
    return settings.app_base_url
