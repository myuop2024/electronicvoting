from __future__ import annotations

from dataclasses import dataclass

@dataclass
class DiditSession:
    session_id: str
    url: str
    status: str


class DiditClient:
    def __init__(self):
        self._base_url = "https://api.didit.me/v1"

    async def create_session(self, subject_id: str) -> DiditSession:
        payload = {
            "subjectId": subject_id,
            "redirectUrl": "https://app.observernet.org/verify/completed"
        }
        # In production use API key auth header. Stubbed response for scaffolding.
        response = {
            "session_id": "sess_demo",
            "url": "https://verify.didit.me/session/sess_demo",
            "status": "created",
        }
        return DiditSession(**response)

    async def verify_webhook_signature(self, signature: str, payload: bytes) -> bool:
        # TODO: implement HMAC verification with settings.didit_webhook_secret
        return bool(signature and payload)
