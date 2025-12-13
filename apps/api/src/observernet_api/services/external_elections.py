"""
External Election APIs Integration for ObserverNet.

Provides integration with major election data providers:
- Google Civic Information API
- Democracy Works VIP (Voter Information Project)
- Associated Press Elections API

Allows admins to import official election data, candidates, and contests.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class ExternalContest:
    """Contest from external API."""

    external_id: str
    title: str
    description: str
    district: str
    type: str  # "referendum", "candidate", "recall"
    candidates: List[ExternalCandidate]
    source: str  # "google_civic", "vip", "ap"
    metadata: Dict[str, Any]


@dataclass
class ExternalCandidate:
    """Candidate from external API."""

    name: str
    party: Optional[str]
    photo_url: Optional[str]
    website: Optional[str]
    bio: Optional[str]
    external_id: Optional[str]


@dataclass
class ExternalElection:
    """Election data from external API."""

    name: str
    date: datetime
    scope: str  # "national", "state", "local"
    contests: List[ExternalContest]
    source: str
    metadata: Dict[str, Any]


class GoogleCivicAPIClient:
    """
    Client for Google Civic Information API.

    Docs: https://developers.google.com/civic-information
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.googleapis.com/civicinfo/v2"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search_elections(self) -> List[ExternalElection]:
        """
        Fetch upcoming elections from Google Civic API.

        Returns:
            List of available elections
        """
        logger.info("fetching_elections_from_google_civic")

        try:
            response = await self.client.get(
                f"{self.base_url}/elections",
                params={"key": self.api_key},
            )
            response.raise_for_status()
            data = response.json()

            elections = []
            for election_data in data.get("elections", []):
                election = ExternalElection(
                    name=election_data.get("name", ""),
                    date=datetime.fromisoformat(
                        election_data.get("electionDay", "2024-01-01").replace("Z", "+00:00")
                    ),
                    scope="national",  # Google API doesn't specify
                    contests=[],
                    source="google_civic",
                    metadata={
                        "election_id": election_data.get("id"),
                        "ocd_division_id": election_data.get("ocdDivisionId"),
                    },
                )
                elections.append(election)

            logger.info("google_civic_elections_fetched", count=len(elections))
            return elections

        except Exception as e:
            logger.error("google_civic_api_error", error=str(e))
            raise

    async def get_voter_info(
        self,
        address: str,
        election_id: Optional[str] = None,
    ) -> ExternalElection:
        """
        Fetch contests for a specific address and election.

        Args:
            address: Voter's address
            election_id: Optional election ID (uses upcoming if not specified)

        Returns:
            Election with contests for that address
        """
        logger.info("fetching_voter_info_from_google_civic", address_hash=hashlib.sha256(address.encode()).hexdigest()[:16])

        params = {
            "key": self.api_key,
            "address": address,
        }

        if election_id:
            params["electionId"] = election_id

        try:
            response = await self.client.get(
                f"{self.base_url}/voterinfo",
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            # Parse contests
            contests = []
            for contest_data in data.get("contests", []):
                candidates = []
                for candidate_data in contest_data.get("candidates", []):
                    candidate = ExternalCandidate(
                        name=candidate_data.get("name", ""),
                        party=candidate_data.get("party"),
                        photo_url=candidate_data.get("photoUrl"),
                        website=candidate_data.get("candidateUrl"),
                        bio=None,
                        external_id=None,
                    )
                    candidates.append(candidate)

                contest = ExternalContest(
                    external_id=contest_data.get("id", hashlib.sha256(contest_data.get("office", "").encode()).hexdigest()[:16]),
                    title=contest_data.get("office", ""),
                    description=contest_data.get("description", ""),
                    district=contest_data.get("district", {}).get("name", ""),
                    type="candidate",
                    candidates=candidates,
                    source="google_civic",
                    metadata={
                        "type": contest_data.get("type"),
                        "level": contest_data.get("level", []),
                        "roles": contest_data.get("roles", []),
                    },
                )
                contests.append(contest)

            # Parse election info
            election_info = data.get("election", {})
            election = ExternalElection(
                name=election_info.get("name", "Election"),
                date=datetime.fromisoformat(
                    election_info.get("electionDay", "2024-01-01").replace("Z", "+00:00")
                ),
                scope="local",
                contests=contests,
                source="google_civic",
                metadata={
                    "election_id": election_info.get("id"),
                    "polling_locations": data.get("pollingLocations", []),
                    "state": data.get("state", []),
                },
            )

            logger.info("voter_info_fetched", contest_count=len(contests))
            return election

        except Exception as e:
            logger.error("google_civic_voterinfo_error", error=str(e))
            raise

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


class VIPAPIClient:
    """
    Client for Democracy Works VIP (Voter Information Project) API.

    Provides normalized election data from state/local sources.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.votinginfoproject.org/v1"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_election_data(
        self,
        state: str,
        election_date: Optional[str] = None,
    ) -> ExternalElection:
        """
        Fetch VIP election data for a state.

        Args:
            state: Two-letter state code
            election_date: Optional date filter (YYYY-MM-DD)

        Returns:
            Election with contests
        """
        logger.info("fetching_vip_election_data", state=state)

        params = {
            "key": self.api_key,
            "state": state,
        }

        if election_date:
            params["election_date"] = election_date

        try:
            response = await self.client.get(
                f"{self.base_url}/elections",
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            # Parse VIP XML/JSON format (varies by state)
            contests = self._parse_vip_contests(data)

            election = ExternalElection(
                name=data.get("name", f"{state} Election"),
                date=datetime.fromisoformat(
                    data.get("date", "2024-01-01")
                ),
                scope="state",
                contests=contests,
                source="vip",
                metadata={
                    "state": state,
                    "vip_id": data.get("id"),
                },
            )

            logger.info("vip_election_fetched", contest_count=len(contests))
            return election

        except Exception as e:
            logger.error("vip_api_error", error=str(e), state=state)
            raise

    def _parse_vip_contests(self, data: Dict[str, Any]) -> List[ExternalContest]:
        """Parse VIP format contests."""
        contests = []

        for contest_data in data.get("contests", []):
            candidates = []
            for candidate_data in contest_data.get("candidates", []):
                candidate = ExternalCandidate(
                    name=candidate_data.get("name", ""),
                    party=candidate_data.get("party"),
                    photo_url=None,
                    website=None,
                    bio=candidate_data.get("bio"),
                    external_id=candidate_data.get("id"),
                )
                candidates.append(candidate)

            contest = ExternalContest(
                external_id=contest_data.get("id", ""),
                title=contest_data.get("title", ""),
                description=contest_data.get("description", ""),
                district=contest_data.get("electoral_district", ""),
                type=contest_data.get("type", "candidate"),
                candidates=candidates,
                source="vip",
                metadata=contest_data.get("metadata", {}),
            )
            contests.append(contest)

        return contests

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


class APElectionsAPIClient:
    """
    Client for Associated Press Elections API.

    Provides real-time election results and race data.
    Note: Requires AP membership and credentials.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.ap.org/v3/elections"
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={"x-api-key": self.api_key},
        )

    async def get_races(self, election_date: str, state: Optional[str] = None) -> ExternalElection:
        """
        Fetch AP election races.

        Args:
            election_date: Date in YYYY-MM-DD format
            state: Optional state filter

        Returns:
            Election with contests
        """
        logger.info("fetching_ap_races", date=election_date, state=state)

        params = {"date": election_date}
        if state:
            params["state"] = state

        try:
            response = await self.client.get(
                f"{self.base_url}/races",
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            contests = []
            for race in data.get("races", []):
                candidates = []
                for candidate_data in race.get("candidates", []):
                    candidate = ExternalCandidate(
                        name=candidate_data.get("last_name", "") + ", " + candidate_data.get("first_name", ""),
                        party=candidate_data.get("party"),
                        photo_url=None,
                        website=None,
                        bio=None,
                        external_id=candidate_data.get("candidate_id"),
                    )
                    candidates.append(candidate)

                contest = ExternalContest(
                    external_id=race.get("race_id", ""),
                    title=race.get("office_name", ""),
                    description=race.get("seat_name", ""),
                    district=race.get("state_postal", ""),
                    type="candidate",
                    candidates=candidates,
                    source="ap",
                    metadata={
                        "race_type": race.get("race_type"),
                        "seat_number": race.get("seat_number"),
                    },
                )
                contests.append(contest)

            election = ExternalElection(
                name=f"AP Election {election_date}",
                date=datetime.fromisoformat(election_date),
                scope="national" if not state else "state",
                contests=contests,
                source="ap",
                metadata={"election_date": election_date},
            )

            logger.info("ap_races_fetched", contest_count=len(contests))
            return election

        except Exception as e:
            logger.error("ap_api_error", error=str(e))
            raise

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


class ExternalElectionService:
    """Service to manage external election API integrations."""

    def __init__(
        self,
        google_civic_key: Optional[str] = None,
        vip_key: Optional[str] = None,
        ap_key: Optional[str] = None,
    ):
        self.google_client = GoogleCivicAPIClient(google_civic_key) if google_civic_key else None
        self.vip_client = VIPAPIClient(vip_key) if vip_key else None
        self.ap_client = APElectionsAPIClient(ap_key) if ap_key else None

    async def import_from_google_civic(
        self,
        address: str,
        election_id: Optional[str] = None,
    ) -> ExternalElection:
        """Import election data from Google Civic API."""
        if not self.google_client:
            raise ValueError("Google Civic API not configured")

        return await self.google_client.get_voter_info(address, election_id)

    async def import_from_vip(
        self,
        state: str,
        election_date: Optional[str] = None,
    ) -> ExternalElection:
        """Import election data from VIP."""
        if not self.vip_client:
            raise ValueError("VIP API not configured")

        return await self.vip_client.get_election_data(state, election_date)

    async def import_from_ap(
        self,
        election_date: str,
        state: Optional[str] = None,
    ) -> ExternalElection:
        """Import election data from AP."""
        if not self.ap_client:
            raise ValueError("AP API not configured")

        return await self.ap_client.get_races(election_date, state)

    async def search_all_sources(
        self,
        query: str,
    ) -> List[ExternalElection]:
        """
        Search all available sources for elections.

        Args:
            query: Search query (address, state, etc.)

        Returns:
            Combined results from all sources
        """
        elections = []

        # Try Google Civic
        if self.google_client:
            try:
                google_results = await self.google_client.search_elections()
                elections.extend(google_results)
            except Exception as e:
                logger.warning("google_civic_search_failed", error=str(e))

        return elections

    async def close_all(self):
        """Close all API clients."""
        if self.google_client:
            await self.google_client.close()
        if self.vip_client:
            await self.vip_client.close()
        if self.ap_client:
            await self.ap_client.close()


# Convenience functions
async def import_election_from_google(
    address: str,
    google_api_key: str,
    election_id: Optional[str] = None,
) -> ExternalElection:
    """Import election from Google Civic API."""
    service = ExternalElectionService(google_civic_key=google_api_key)
    try:
        return await service.import_from_google_civic(address, election_id)
    finally:
        await service.close_all()


async def import_election_from_vip(
    state: str,
    vip_api_key: str,
    election_date: Optional[str] = None,
) -> ExternalElection:
    """Import election from VIP."""
    service = ExternalElectionService(vip_key=vip_api_key)
    try:
        return await service.import_from_vip(state, election_date)
    finally:
        await service.close_all()
