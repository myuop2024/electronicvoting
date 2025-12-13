"""
Tests for the Paper Ballot API.

Tests cover:
- Paper ballot upload
- OCR processing
- Human review workflow
- Ballot approval and counting
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from observernet_api.app import create_app
from observernet_api.services.ocr import (
    PaperBallotOCR,
    PaperBallotWorkflow,
    MarkType,
    BallotMark,
    OCRResult,
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


class TestOCRService:
    """Tests for OCR service functionality."""

    def test_mark_type_enum(self):
        """Test MarkType enum values."""
        assert MarkType.FILLED.value == "filled"
        assert MarkType.PARTIAL.value == "partial"
        assert MarkType.CHECKMARK.value == "checkmark"
        assert MarkType.CROSSED.value == "crossed"
        assert MarkType.EMPTY.value == "empty"
        assert MarkType.AMBIGUOUS.value == "ambiguous"

    def test_ballot_mark_dataclass(self):
        """Test BallotMark dataclass."""
        mark = BallotMark(
            contest_id="contest_1",
            option_id="option_a",
            mark_type=MarkType.FILLED,
            confidence=0.95,
            bounding_box=(100, 100, 150, 150),
            requires_review=False,
        )

        assert mark.contest_id == "contest_1"
        assert mark.confidence == 0.95
        assert not mark.requires_review

    def test_ocr_result_dataclass(self):
        """Test OCRResult dataclass."""
        result = OCRResult(
            ballot_id="pb_test123",
            election_id="elec_123",
            marks=[],
            raw_text="",
            overall_confidence=0.85,
            requires_human_review=False,
            processing_time_ms=150,
            warnings=[],
        )

        assert result.ballot_id.startswith("pb_")
        assert result.overall_confidence == 0.85

    @pytest.mark.asyncio
    async def test_ocr_confidence_threshold(self):
        """Test OCR confidence threshold setting."""
        ocr = PaperBallotOCR(confidence_threshold=0.90)
        assert ocr.confidence_threshold == 0.90

        ocr_low = PaperBallotOCR(confidence_threshold=0.70)
        assert ocr_low.confidence_threshold == 0.70


class TestWorkflow:
    """Tests for paper ballot workflow."""

    @pytest.mark.asyncio
    async def test_workflow_initialization(self):
        """Test workflow initializes with OCR service."""
        workflow = PaperBallotWorkflow()

        assert workflow.ocr is not None
        assert isinstance(workflow.ocr, PaperBallotOCR)
        assert len(workflow.pending_reviews) == 0

    @pytest.mark.asyncio
    async def test_pending_reviews_filtering(self):
        """Test pending reviews can be filtered by election."""
        workflow = PaperBallotWorkflow()

        # Add mock pending reviews
        workflow.pending_reviews["ballot_1"] = OCRResult(
            ballot_id="ballot_1",
            election_id="election_a",
            marks=[],
            raw_text="",
            overall_confidence=0.70,
            requires_human_review=True,
            processing_time_ms=100,
            warnings=[],
        )
        workflow.pending_reviews["ballot_2"] = OCRResult(
            ballot_id="ballot_2",
            election_id="election_b",
            marks=[],
            raw_text="",
            overall_confidence=0.65,
            requires_human_review=True,
            processing_time_ms=120,
            warnings=[],
        )

        # Filter by election
        pending_a = await workflow.get_pending_reviews(election_id="election_a")
        pending_b = await workflow.get_pending_reviews(election_id="election_b")
        pending_all = await workflow.get_pending_reviews()

        assert len(pending_a) == 1
        assert len(pending_b) == 1
        assert len(pending_all) == 2

    @pytest.mark.asyncio
    async def test_human_review_submission(self):
        """Test human review submission removes from pending."""
        workflow = PaperBallotWorkflow()

        # Add a pending review
        workflow.pending_reviews["ballot_test"] = OCRResult(
            ballot_id="ballot_test",
            election_id="election_123",
            marks=[
                BallotMark(
                    contest_id="c1",
                    option_id="o1",
                    mark_type=MarkType.AMBIGUOUS,
                    confidence=0.50,
                    bounding_box=(0, 0, 10, 10),
                    requires_review=True,
                ),
            ],
            raw_text="",
            overall_confidence=0.50,
            requires_human_review=True,
            processing_time_ms=100,
            warnings=[],
        )

        # Submit review
        result = await workflow.submit_human_review(
            ballot_id="ballot_test",
            reviewer_id="reviewer_1",
            reviewed_marks=[
                {"contest_id": "c1", "option_id": "o1", "mark_type": "filled"},
            ],
        )

        assert result["status"] == "approved"
        assert "ballot_test" not in workflow.pending_reviews


class TestPaperBallotAPI:
    """Tests for paper ballot API endpoints."""

    @pytest.mark.asyncio
    async def test_upload_unauthorized(self, client):
        """Test paper ballot upload without auth fails."""
        response = await client.post(
            "/api/paper/election_123/upload",
            files={"file": ("ballot.png", b"fake_image_data", "image/png")},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_pending_reviews_unauthorized(self, client):
        """Test pending reviews list without auth fails."""
        response = await client.get("/api/paper/election_123/pending")
        assert response.status_code == 401


class TestImageProcessing:
    """Tests for image processing functions."""

    @pytest.mark.asyncio
    async def test_mock_ocr_without_pil(self):
        """Test OCR returns mock result without PIL installed."""
        ocr = PaperBallotOCR()

        # Minimal test image data
        image_data = b"test_image_data"

        result = await ocr.process_ballot_image(
            image_data=image_data,
            election_id="test_election",
            ballot_template={"mark_regions": []},
        )

        # Should get a result even without real image processing
        assert result.ballot_id.startswith("pb_")
        assert result.election_id == "test_election"


class TestBallotTemplate:
    """Tests for ballot template functionality."""

    def test_template_structure(self):
        """Test ballot template structure."""
        template = {
            "name": "Standard Ballot",
            "mark_regions": [
                {
                    "contest_id": "contest_1",
                    "option_id": "option_a",
                    "bounds": [100, 100, 140, 140],
                },
                {
                    "contest_id": "contest_1",
                    "option_id": "option_b",
                    "bounds": [100, 150, 140, 190],
                },
            ],
            "page_size": "letter",
            "dpi": 300,
        }

        assert template["name"] == "Standard Ballot"
        assert len(template["mark_regions"]) == 2
        assert template["dpi"] == 300


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
