"""
Shared test fixtures and configuration.

This file is automatically loaded by pytest and provides
common fixtures for all test modules.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient, ASGITransport


@pytest.fixture
def app():
    """Create test application."""
    from observernet_api.app import create_app
    return create_app()


@pytest_asyncio.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def mock_subject():
    """Create a mock authenticated subject."""
    from observernet_api.security.auth import Subject, OrgMembership

    return Subject(
        user_id="test_user_123",
        email="test@example.com",
        is_platform_admin=False,
        mfa_verified=True,
        org_memberships=[
            OrgMembership(
                org_id="org_123",
                role="admin",
                permissions=["elections.create", "elections.manage"],
            ),
        ],
        roles=["org_admin"],
    )


@pytest.fixture
def mock_admin_subject():
    """Create a mock platform admin subject."""
    from observernet_api.security.auth import Subject

    return Subject(
        user_id="admin_123",
        email="admin@example.com",
        is_platform_admin=True,
        mfa_verified=True,
        org_memberships=[],
        roles=["platform_admin"],
    )


@pytest.fixture
def sample_election_data():
    """Sample election creation data."""
    return {
        "name": "Test Election 2024",
        "description": "A test election for unit testing",
        "org_id": "org_123",
        "voting_start_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "voting_end_at": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "policies": {
            "allowVoteChange": False,
            "requireVerification": True,
            "verificationMethods": ["access_code"],
        },
        "contests": [
            {
                "name": "President",
                "options": [
                    {"name": "Candidate A"},
                    {"name": "Candidate B"},
                ],
            },
        ],
    }


@pytest.fixture
def sample_ballot_selections():
    """Sample ballot selections."""
    return [
        {"contestId": "contest_1", "optionId": "option_a"},
        {"contestId": "contest_2", "optionId": "option_b"},
    ]


@pytest.fixture
def sample_access_code():
    """Sample access code for testing."""
    return "ABCD1234"


@pytest.fixture
def mock_fabric_client():
    """Create a mock Fabric client."""
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.submit_ballot_commitment = AsyncMock(return_value={
        "txId": "mock_tx_123",
        "blockNumber": 42,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "COMMITTED",
    })
    client.verify_ballot_commitment = AsyncMock(return_value={
        "valid": True,
        "txId": "mock_tx_123",
        "blockNumber": 42,
    })
    return client


# Pytest configuration
def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )


# Environment setup for testing
@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """Set up test environment variables."""
    monkeypatch.setenv("NODE_ENV", "test")
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    monkeypatch.setenv("SESSION_SECRET", "test_secret_key_for_testing")
    monkeypatch.setenv("JWT_SECRET", "test_jwt_secret_for_testing")
