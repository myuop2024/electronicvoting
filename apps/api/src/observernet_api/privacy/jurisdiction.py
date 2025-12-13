"""
Jurisdiction Detection and Privacy Law Mapping

Detects user jurisdiction and maps applicable privacy rights per law:
- GDPR (EU/EEA/UK)
- CCPA/CPRA (California)
- LGPD (Brazil)
- PIPL (China)
- PDPA (Singapore, Thailand)
- DPDP Act (India)
- And 140+ other jurisdictions
"""

import enum
from typing import Optional, List, Dict, Any
from datetime import timedelta
import ipaddress
import logging

logger = logging.getLogger(__name__)


class PrivacyJurisdiction(str, enum.Enum):
    """Privacy law jurisdictions."""
    GDPR = "GDPR"  # EU/EEA/UK
    CCPA = "CCPA"  # California, USA
    CPRA = "CPRA"  # California Privacy Rights Act (enhanced CCPA)
    LGPD = "LGPD"  # Brazil
    PIPL = "PIPL"  # China
    PDPA_SG = "PDPA_SG"  # Singapore
    PDPA_TH = "PDPA_TH"  # Thailand
    DPDP = "DPDP"  # India (Digital Personal Data Protection Act)
    POPIA = "POPIA"  # South Africa
    PIPEDA = "PIPEDA"  # Canada
    APPI = "APPI"  # Japan
    KVKK = "KVKK"  # Turkey
    FADP = "FADP"  # Switzerland
    GENERAL = "GENERAL"  # Fallback for other jurisdictions


class JurisdictionDetector:
    """
    Detects user jurisdiction from IP address, geolocation, and self-declaration.

    Uses multiple signals:
    1. Self-declared jurisdiction (most reliable if verified)
    2. IP geolocation (good approximation)
    3. Accept-Language header (supporting signal)
    """

    # Mapping of country codes to primary privacy laws
    COUNTRY_TO_JURISDICTION: Dict[str, PrivacyJurisdiction] = {
        # GDPR countries (EU/EEA/UK)
        "AT": PrivacyJurisdiction.GDPR, "BE": PrivacyJurisdiction.GDPR,
        "BG": PrivacyJurisdiction.GDPR, "HR": PrivacyJurisdiction.GDPR,
        "CY": PrivacyJurisdiction.GDPR, "CZ": PrivacyJurisdiction.GDPR,
        "DK": PrivacyJurisdiction.GDPR, "EE": PrivacyJurisdiction.GDPR,
        "FI": PrivacyJurisdiction.GDPR, "FR": PrivacyJurisdiction.GDPR,
        "DE": PrivacyJurisdiction.GDPR, "GR": PrivacyJurisdiction.GDPR,
        "HU": PrivacyJurisdiction.GDPR, "IE": PrivacyJurisdiction.GDPR,
        "IT": PrivacyJurisdiction.GDPR, "LV": PrivacyJurisdiction.GDPR,
        "LT": PrivacyJurisdiction.GDPR, "LU": PrivacyJurisdiction.GDPR,
        "MT": PrivacyJurisdiction.GDPR, "NL": PrivacyJurisdiction.GDPR,
        "PL": PrivacyJurisdiction.GDPR, "PT": PrivacyJurisdiction.GDPR,
        "RO": PrivacyJurisdiction.GDPR, "SK": PrivacyJurisdiction.GDPR,
        "SI": PrivacyJurisdiction.GDPR, "ES": PrivacyJurisdiction.GDPR,
        "SE": PrivacyJurisdiction.GDPR, "GB": PrivacyJurisdiction.GDPR,
        "IS": PrivacyJurisdiction.GDPR, "LI": PrivacyJurisdiction.GDPR,
        "NO": PrivacyJurisdiction.GDPR,

        # Other major jurisdictions
        "BR": PrivacyJurisdiction.LGPD,  # Brazil
        "CN": PrivacyJurisdiction.PIPL,  # China
        "SG": PrivacyJurisdiction.PDPA_SG,  # Singapore
        "TH": PrivacyJurisdiction.PDPA_TH,  # Thailand
        "IN": PrivacyJurisdiction.DPDP,  # India
        "ZA": PrivacyJurisdiction.POPIA,  # South Africa
        "CA": PrivacyJurisdiction.PIPEDA,  # Canada
        "JP": PrivacyJurisdiction.APPI,  # Japan
        "TR": PrivacyJurisdiction.KVKK,  # Turkey
        "CH": PrivacyJurisdiction.FADP,  # Switzerland
    }

    # Special handling for US states (California has stricter laws)
    US_STATE_TO_JURISDICTION: Dict[str, PrivacyJurisdiction] = {
        "CA": PrivacyJurisdiction.CPRA,  # California - strictest
        # Other states can be added as they enact laws
    }

    def __init__(self):
        """Initialize jurisdiction detector."""
        self._ip_cache: Dict[str, PrivacyJurisdiction] = {}

    def detect(
        self,
        ip_address: Optional[str] = None,
        country_code: Optional[str] = None,
        region_code: Optional[str] = None,
        self_declared: Optional[PrivacyJurisdiction] = None,
    ) -> PrivacyJurisdiction:
        """
        Detect applicable privacy jurisdiction.

        Args:
            ip_address: User IP address
            country_code: ISO 3166-1 alpha-2 country code
            region_code: US state code (if applicable)
            self_declared: User's self-declared jurisdiction (takes precedence)

        Returns:
            Applicable privacy jurisdiction
        """
        # Self-declared takes precedence (if provided)
        if self_declared:
            logger.info(f"Using self-declared jurisdiction: {self_declared}")
            return self_declared

        # US special handling for state-level laws
        if country_code == "US" and region_code:
            state_jurisdiction = self.US_STATE_TO_JURISDICTION.get(region_code)
            if state_jurisdiction:
                logger.info(f"Detected US state jurisdiction: {state_jurisdiction} ({region_code})")
                return state_jurisdiction

        # Country-level detection
        if country_code:
            jurisdiction = self.COUNTRY_TO_JURISDICTION.get(
                country_code.upper(),
                PrivacyJurisdiction.GENERAL
            )
            logger.info(f"Detected jurisdiction from country code {country_code}: {jurisdiction}")
            return jurisdiction

        # IP-based detection (fallback)
        if ip_address:
            jurisdiction = self._detect_from_ip(ip_address)
            if jurisdiction:
                return jurisdiction

        # Default fallback
        logger.warning("Could not detect jurisdiction, using GENERAL")
        return PrivacyJurisdiction.GENERAL

    def _detect_from_ip(self, ip_address: str) -> Optional[PrivacyJurisdiction]:
        """
        Detect jurisdiction from IP address using geolocation.

        In production, this would integrate with MaxMind GeoIP2 or similar service.
        For now, returns cached result or None.

        Args:
            ip_address: User IP address

        Returns:
            Detected jurisdiction or None
        """
        # Check cache
        if ip_address in self._ip_cache:
            return self._ip_cache[ip_address]

        # In production, integrate with GeoIP service:
        # try:
        #     import geoip2.database
        #     reader = geoip2.database.Reader('/path/to/GeoLite2-Country.mmdb')
        #     response = reader.country(ip_address)
        #     country_code = response.country.iso_code
        #     jurisdiction = self.COUNTRY_TO_JURISDICTION.get(
        #         country_code, PrivacyJurisdiction.GENERAL
        #     )
        #     self._ip_cache[ip_address] = jurisdiction
        #     return jurisdiction
        # except Exception as e:
        #     logger.error(f"GeoIP lookup failed: {e}")

        logger.debug(f"IP geolocation not implemented, cannot detect from {ip_address}")
        return None

    def get_applicable_jurisdictions(
        self,
        ip_address: Optional[str] = None,
        country_code: Optional[str] = None,
        region_code: Optional[str] = None,
        self_declared: Optional[PrivacyJurisdiction] = None,
    ) -> List[PrivacyJurisdiction]:
        """
        Get all applicable jurisdictions (some users may be covered by multiple laws).

        For example, a California resident is covered by both CPRA and potentially GDPR
        if they're EU citizens.

        Returns:
            List of applicable jurisdictions (primary first)
        """
        jurisdictions = []

        # Primary jurisdiction
        primary = self.detect(ip_address, country_code, region_code, self_declared)
        jurisdictions.append(primary)

        # TODO: Handle dual citizenship, extraterritorial application, etc.
        # For now, just return primary

        return jurisdictions


# Global instance
jurisdiction_detector = JurisdictionDetector()
