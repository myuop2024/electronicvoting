from functools import lru_cache
from typing import List

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    environment: str = Field(default="development")
    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")
    session_secret: str = Field(alias="SESSION_SECRET", default="dev-secret")
    fabric_gateway_url: str = Field(alias="FABRIC_GATEWAY_URL")
    fabric_msp_id: str = Field(alias="FABRIC_MSP_ID")
    fabric_channel: str = Field(alias="FABRIC_CHANNEL_NAME", default="election")
    fabric_chaincode: str = Field(alias="FABRIC_CHAINCODE_NAME", default="ballot_cc")
    didit_client_id: str = Field(alias="DIDIT_CLIENT_ID")
    didit_client_secret: str = Field(alias="DIDIT_CLIENT_SECRET")
    didit_webhook_secret: str = Field(alias="DIDIT_WEBHOOK_SECRET")
    whatsapp_provider: str = Field(alias="WHATSAPP_PROVIDER", default="twilio")
    email_provider: str = Field(alias="EMAIL_PROVIDER", default="ses")
    cors_allow_origins: List[str] = Field(default=["https://admin.observernet.org", "https://app.observernet.org"])
    vault_addr: str | None = Field(default=None, alias="VAULT_ADDR")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
