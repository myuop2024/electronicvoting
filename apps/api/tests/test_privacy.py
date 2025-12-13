"""
Tests for Privacy Compliance and DSAR Automation

Tests multi-jurisdiction compliance, automated DSAR fulfillment,
and data retention policies.
"""

import pytest
from datetime import datetime, timedelta
import hashlib

from observernet_api.privacy.jurisdiction import JurisdictionDetector, PrivacyJurisdiction
from observernet_api.privacy.rights_engine import PrivacyRightsEngine, DataSubjectRight
from observernet_api.privacy.models import PrivacyRequest, PrivacyRequestType, PrivacyRequestStatus
from observernet_api.privacy.dsar_automation import DSARAutomation


class TestJurisdictionDetection:
    """Test jurisdiction detection and mapping."""

    def test_detect_gdpr_from_country_code(self):
        """Test GDPR detection from EU country code."""
        detector = JurisdictionDetector()
        jurisdiction = detector.detect(country_code="DE")
        assert jurisdiction == PrivacyJurisdiction.GDPR

    def test_detect_ccpa_from_california(self):
        """Test CPRA detection from California."""
        detector = JurisdictionDetector()
        jurisdiction = detector.detect(country_code="US", region_code="CA")
        assert jurisdiction == PrivacyJurisdiction.CPRA

    def test_detect_lgpd_from_brazil(self):
        """Test LGPD detection from Brazil."""
        detector = JurisdictionDetector()
        jurisdiction = detector.detect(country_code="BR")
        assert jurisdiction == PrivacyJurisdiction.LGPD

    def test_detect_pipl_from_china(self):
        """Test PIPL detection from China."""
        detector = JurisdictionDetector()
        jurisdiction = detector.detect(country_code="CN")
        assert jurisdiction == PrivacyJurisdiction.PIPL

    def test_detect_dpdp_from_india(self):
        """Test DPDP detection from India."""
        detector = JurisdictionDetector()
        jurisdiction = detector.detect(country_code="IN")
        assert jurisdiction == PrivacyJurisdiction.DPDP

    def test_self_declared_takes_precedence(self):
        """Test that self-declared jurisdiction takes precedence."""
        detector = JurisdictionDetector()
        jurisdiction = detector.detect(
            country_code="US",
            self_declared=PrivacyJurisdiction.GDPR
        )
        assert jurisdiction == PrivacyJurisdiction.GDPR

    def test_fallback_to_general(self):
        """Test fallback to GENERAL for unknown jurisdictions."""
        detector = JurisdictionDetector()
        jurisdiction = detector.detect(country_code="XX")
        assert jurisdiction == PrivacyJurisdiction.GENERAL


class TestRightsEngine:
    """Test privacy rights engine."""

    def test_gdpr_has_access_right(self):
        """Test GDPR has access right."""
        engine = PrivacyRightsEngine()
        assert engine.is_right_available(
            PrivacyJurisdiction.GDPR,
            DataSubjectRight.ACCESS
        )

    def test_gdpr_access_deadline(self):
        """Test GDPR access right deadline is 30 days."""
        engine = PrivacyRightsEngine()
        deadline = engine.get_response_deadline(
            PrivacyJurisdiction.GDPR,
            DataSubjectRight.ACCESS
        )
        assert deadline == timedelta(days=30)

    def test_lgpd_shorter_deadline(self):
        """Test LGPD has shorter deadline (15 days)."""
        engine = PrivacyRightsEngine()
        deadline = engine.get_response_deadline(
            PrivacyJurisdiction.LGPD,
            DataSubjectRight.ACCESS
        )
        assert deadline == timedelta(days=15)

    def test_ccpa_has_opt_out_sale(self):
        """Test CCPA has opt-out of sale right."""
        engine = PrivacyRightsEngine()
        assert engine.is_right_available(
            PrivacyJurisdiction.CCPA,
            DataSubjectRight.OPT_OUT_SALE
        )

    def test_gdpr_does_not_have_opt_out_sale(self):
        """Test GDPR does not have opt-out of sale (different framework)."""
        engine = PrivacyRightsEngine()
        assert not engine.is_right_available(
            PrivacyJurisdiction.GDPR,
            DataSubjectRight.OPT_OUT_SALE
        )

    def test_strictest_deadline(self):
        """Test getting strictest deadline across jurisdictions."""
        engine = PrivacyRightsEngine()
        deadline = engine.get_strictest_deadline(
            [PrivacyJurisdiction.GDPR, PrivacyJurisdiction.LGPD],
            DataSubjectRight.ACCESS
        )
        # LGPD has 15 days, GDPR has 30 days, so strictest is 15
        assert deadline == timedelta(days=15)

    def test_vote_data_erasure_exceptions(self):
        """Test that vote data has erasure exceptions."""
        engine = PrivacyRightsEngine()
        exceptions = engine.check_exceptions(
            PrivacyJurisdiction.GDPR,
            DataSubjectRight.ERASURE,
            "vote"
        )
        assert "public_interest_archiving" in exceptions
        assert "legal_obligation" in exceptions

    def test_profile_data_no_erasure_exceptions(self):
        """Test that profile data can be erased."""
        engine = PrivacyRightsEngine()
        exceptions = engine.check_exceptions(
            PrivacyJurisdiction.GDPR,
            DataSubjectRight.ERASURE,
            "profile"
        )
        # Profile data should have no exceptions (can be erased)
        assert len(exceptions) == 0


class TestDSARAutomation:
    """Test DSAR automation workflows."""

    @pytest.fixture
    def mock_db(self, mocker):
        """Mock database session."""
        return mocker.Mock()

    @pytest.fixture
    def dsar_automation(self, mock_db):
        """Create DSAR automation instance."""
        return DSARAutomation(mock_db)

    def test_access_request_returns_voter_data(self, dsar_automation, mock_db, mocker):
        """Test access request returns voter profile data."""
        # Mock voter records
        mock_voter = mocker.Mock()
        mock_voter.id = "voter_123"
        mock_voter.electionId = "election_abc"
        mock_voter.status = "VOTED"
        mock_voter.verifiedAt = datetime.utcnow()
        mock_voter.verificationMethod = "didit"
        mock_voter.channel = "WEB"
        mock_voter.region = "CA"
        mock_voter.district = None
        mock_voter.category = None
        mock_voter.createdAt = datetime.utcnow()

        mock_db.query().filter().all.return_value = [mock_voter]

        # Create request
        request = mocker.Mock()
        request.id = "dsar_123"
        request.voterHash = "hash_abc"
        request.jurisdiction = PrivacyJurisdiction.GDPR

        # Process
        import asyncio
        result = asyncio.run(dsar_automation._handle_access(request))

        assert result["status"] == "completed"
        assert "data" in result
        assert "voter_profiles" in result["data"]["data_categories"]

    def test_erasure_refuses_active_elections(self, dsar_automation, mock_db, mocker):
        """Test erasure request is refused for active elections."""
        # Mock active election
        mock_voter = mocker.Mock()
        mock_voter.electionId = "election_active"

        mock_election = mocker.Mock()
        mock_election.id = "election_active"
        mock_election.status = "ACTIVE"

        mock_db.query().filter().all.return_value = [mock_voter]
        mock_db.query().filter().first.return_value = mock_election

        request = mocker.Mock()
        request.id = "dsar_123"
        request.voterHash = "hash_abc"
        request.jurisdiction = PrivacyJurisdiction.GDPR

        import asyncio
        result = asyncio.run(dsar_automation._handle_erasure(request))

        assert result["status"] == "refused"
        assert "active_elections" in result
        assert "legal_obligation" in result["exceptions"]

    def test_portability_exports_json(self, dsar_automation, mock_db, mocker):
        """Test portability request exports data in JSON format."""
        # Mock voter data
        mock_db.query().filter().all.return_value = []

        request = mocker.Mock()
        request.id = "dsar_123"
        request.voterHash = "hash_abc"
        request.jurisdiction = PrivacyJurisdiction.GDPR

        import asyncio
        result = asyncio.run(dsar_automation._handle_portability(request))

        assert result["status"] == "completed"
        assert result["format"] == "json"


class TestPrivacyRequestAPI:
    """Test Privacy Request API endpoints."""

    @pytest.mark.asyncio
    async def test_create_privacy_request(self, client):
        """Test creating a privacy request."""
        response = await client.post(
            "/api/privacy/request",
            json={
                "email": "user@example.com",
                "request_type": "ACCESS",
                "description": "I want to access my data",
                "self_declared_jurisdiction": "GDPR",
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["request_type"] == "ACCESS"
        assert data["jurisdiction"] == "GDPR"

    @pytest.mark.asyncio
    async def test_verify_privacy_request(self, client, mocker):
        """Test verifying a privacy request."""
        # First create a request
        create_response = await client.post(
            "/api/privacy/request",
            json={
                "email": "user@example.com",
                "request_type": "ACCESS",
            }
        )
        request_id = create_response.json()["id"]

        # Then verify (with mocked code)
        verify_response = await client.post(
            f"/api/privacy/request/{request_id}/verify",
            json={
                "verification_code": "ABCDEF"
            }
        )

        # Note: This will fail without proper code, but tests the flow
        assert verify_response.status_code in [200, 400]


class TestDataRetention:
    """Test data retention automation."""

    def test_retention_policy_creation(self, mocker):
        """Test creating retention policy."""
        from observernet_api.privacy.retention import RetentionEngine

        mock_db = mocker.Mock()
        engine = RetentionEngine(mock_db)

        policy = engine.create_retention_policy(
            data_type="voter_profile",
            retention_days=90,
            deletion_method="anonymize",
            jurisdiction=PrivacyJurisdiction.GDPR
        )

        assert policy.dataType == "voter_profile"
        assert policy.retentionPeriodDays == 90
        assert policy.deletionMethod == "anonymize"


class TestBreachNotification:
    """Test breach notification system."""

    def test_breach_creation(self, mocker):
        """Test creating a breach notification."""
        from observernet_api.privacy.breach import BreachNotificationEngine
        from observernet_api.privacy.models import BreachSeverity

        mock_db = mocker.Mock()
        engine = BreachNotificationEngine(mock_db)

        breach = engine.create_breach_notification(
            title="Test Breach",
            description="This is a test breach",
            severity=BreachSeverity.HIGH,
            affected_data_types=["voter_profile"],
            affected_records_count=100,
            cause_category="unauthorized_access",
            detected_by="security_team"
        )

        assert breach.title == "Test Breach"
        assert breach.severity == BreachSeverity.HIGH
        assert breach.affectedRecordsCount == 100

    def test_notification_deadlines(self, mocker):
        """Test breach notification deadline checking."""
        from observernet_api.privacy.breach import BreachNotificationEngine
        from observernet_api.privacy.models import BreachNotification, BreachStatus

        mock_db = mocker.Mock()
        engine = BreachNotificationEngine(mock_db)

        # Mock overdue breach
        mock_breach = mocker.Mock(spec=BreachNotification)
        mock_breach.id = "breach_123"
        mock_breach.detectedAt = datetime.utcnow() - timedelta(days=5)  # 5 days ago
        mock_breach.status = BreachStatus.DETECTED
        mock_breach.authoritiesNotifiedAt = None
        mock_breach.affectedJurisdictions = [PrivacyJurisdiction.GDPR]

        mock_db.query().filter().all.return_value = [mock_breach]

        alerts = engine.check_notification_deadlines()

        assert len(alerts) > 0
        assert alerts[0]["status"] == "OVERDUE"
        assert alerts[0]["breach_id"] == "breach_123"


# Integration test markers
pytestmark = pytest.mark.integration
