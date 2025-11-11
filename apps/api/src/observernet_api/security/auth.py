from dataclasses import dataclass
from typing import Optional

from fastapi import Header


@dataclass
class Subject:
    subject_id: str
    org_id: Optional[str]
    roles: list[str]


async def get_current_subject(authorization: str = Header(default="")) -> Optional[Subject]:
    # TODO: Validate PASETO/JWT token with OIDC provider. Stubbed subject for scaffolding.
    if not authorization:
        return None
    return Subject(subject_id="demo-subject", org_id="demo-org", roles=["org_admin"])
