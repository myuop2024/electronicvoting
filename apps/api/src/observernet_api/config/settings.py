from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    environment: str = Field(default="development")
    database_url: str = Field(default="postgresql://localhost/observernet", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379", alias="REDIS_URL")
    session_secret: str = Field(default="dev-secret-change-in-production", alias="SESSION_SECRET")

    # Hyperledger Fabric
    fabric_gateway_url: str = Field(default="mock", alias="FABRIC_GATEWAY_URL")
    fabric_msp_id: str = Field(default="Org1MSP", alias="FABRIC_MSP_ID")
    fabric_channel: str = Field(default="election", alias="FABRIC_CHANNEL_NAME")
    fabric_chaincode: str = Field(default="ballot_cc", alias="FABRIC_CHAINCODE_NAME")

    # Didit KYC
    didit_api_key: str = Field(default="", alias="DIDIT_API_KEY")
    didit_client_id: str = Field(default="", alias="DIDIT_CLIENT_ID")
    didit_client_secret: str = Field(default="", alias="DIDIT_CLIENT_SECRET")
    didit_webhook_secret: str = Field(default="", alias="DIDIT_WEBHOOK_SECRET")

    # Application URLs
    app_base_url: str = Field(default="http://localhost:3000", alias="APP_BASE_URL")

    # Messaging providers
    whatsapp_provider: str = Field(default="twilio", alias="WHATSAPP_PROVIDER")
    email_provider: str = Field(default="mock", alias="EMAIL_PROVIDER")

    # CORS
    cors_allow_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
    )

    # Optional integrations
    vault_addr: Optional[str] = Field(default=None, alias="VAULT_ADDR")

    # OCR settings
    tesseract_cmd: Optional[str] = Field(default=None, alias="TESSERACT_CMD")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
