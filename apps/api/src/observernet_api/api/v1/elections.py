from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel

from ...security.auth import Subject, get_current_subject

router = APIRouter()


class ElectionCreateRequest(BaseModel):
    name: str
    description: str
    org_id: str
    policies: dict
    languages: list[str]
    branding: dict


class ElectionCreateResponse(BaseModel):
    election_id: str
    status: str


class AllowlistImportRequest(BaseModel):
    format: str
    entries: list[dict]


class CodeGenerateRequest(BaseModel):
    count: int
    scope: str
    expires_at: str | None = None
    mode: str = "single-use"


class CodeConsumeRequest(BaseModel):
    code: str
    election_id: str


@router.post("", response_model=ElectionCreateResponse)
async def create_election(
    payload: ElectionCreateRequest,
    subject: Annotated[Subject | None, Depends(get_current_subject)]
):
    if not subject or "org_admin" not in subject.roles:
        raise HTTPException(status_code=403, detail="Forbidden")

    # TODO: persist to database and schedule provisioning tasks
    return ElectionCreateResponse(election_id="elex-123", status="draft")


@router.post("/{election_id}/allowlist/import")
async def import_allowlist(
    election_id: Annotated[str, Path(description="Election identifier")],
    payload: AllowlistImportRequest,
    subject: Annotated[Subject | None, Depends(get_current_subject)]
):
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # TODO: normalize, salt, hash entries and persist
    return {"status": "queued", "entries": len(payload.entries)}


@router.post("/{election_id}/codes/generate")
async def generate_codes(
    election_id: str,
    payload: CodeGenerateRequest,
    subject: Annotated[Subject | None, Depends(get_current_subject)]
):
    if not subject:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # TODO: call worker task to generate secure codes and deliver via providers
    return {"status": "generating", "requested": payload.count}


@router.post("/{election_id}/codes/consume")
async def consume_code(payload: CodeConsumeRequest):
    # TODO: validate code with rate limits and scoping
    if payload.code != "demo":
        raise HTTPException(status_code=400, detail="Invalid code")
    return {"status": "accepted"}
