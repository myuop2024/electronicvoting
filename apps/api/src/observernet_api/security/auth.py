"""
Authentication middleware for FastAPI
Validates JWT tokens from NextAuth and extracts user/organization context
"""

import os
import json
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime

import jwt
from jwt import PyJWKClient, ExpiredSignatureError, InvalidTokenError
from fastapi import Header, HTTPException, Depends, Request
from functools import lru_cache

from ..config.settings import settings


@dataclass
class OrgMembership:
    """Organization membership details"""
    org_id: str
    role: str


@dataclass
class Subject:
    """Authenticated user subject"""
    subject_id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    display_name: Optional[str]
    platform_role: str
    current_org_id: Optional[str]
    current_org_role: Optional[str]
    org_memberships: List[OrgMembership]
    mfa_enabled: bool
    mfa_verified: bool

    @property
    def is_admin(self) -> bool:
        """Check if user has platform admin role"""
        return self.platform_role in ("ADMIN", "SUPERADMIN")

    @property
    def is_superadmin(self) -> bool:
        """Check if user is superadmin"""
        return self.platform_role == "SUPERADMIN"

    def has_org_role(self, org_id: str, roles: List[str]) -> bool:
        """Check if user has any of the specified roles in the organization"""
        for membership in self.org_memberships:
            if membership.org_id == org_id and membership.role in roles:
                return True
        return False

    def can_manage_org(self, org_id: str) -> bool:
        """Check if user can manage the organization"""
        return self.has_org_role(org_id, ["OWNER", "ADMIN"])

    def can_access_org(self, org_id: str) -> bool:
        """Check if user has any access to the organization"""
        return self.has_org_role(org_id, ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"])


def get_jwt_secret() -> str:
    """Get JWT secret from environment or settings"""
    # NextAuth uses NEXTAUTH_SECRET for JWT signing
    secret = os.getenv("NEXTAUTH_SECRET") or os.getenv("AUTH_SECRET")
    if not secret:
        # Fallback to session_secret for development
        secret = settings.session_secret
    return secret


def decode_jwt_token(token: str) -> dict:
    """
    Decode and validate a JWT token from NextAuth

    NextAuth uses HS256 by default with NEXTAUTH_SECRET
    """
    secret = get_jwt_secret()

    try:
        # NextAuth JWT tokens are signed with HS256
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
            }
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_subject_from_payload(payload: dict) -> Subject:
    """Extract Subject from decoded JWT payload"""
    # NextAuth stores user data in the token
    user_id = payload.get("id") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token: missing user ID",
        )

    # Extract organization memberships
    org_memberships_raw = payload.get("orgMemberships", [])
    org_memberships = [
        OrgMembership(org_id=m.get("orgId"), role=m.get("role"))
        for m in org_memberships_raw
        if m.get("orgId") and m.get("role")
    ]

    return Subject(
        subject_id=user_id,
        email=payload.get("email", ""),
        first_name=payload.get("firstName"),
        last_name=payload.get("lastName"),
        display_name=payload.get("displayName"),
        platform_role=payload.get("platformRole", "USER"),
        current_org_id=payload.get("currentOrgId"),
        current_org_role=payload.get("currentOrgRole"),
        org_memberships=org_memberships,
        mfa_enabled=payload.get("mfaEnabled", False),
        mfa_verified=payload.get("mfaVerified", False),
    )


async def get_current_subject(
    authorization: str = Header(default="", alias="Authorization")
) -> Optional[Subject]:
    """
    Dependency to get the current authenticated subject from JWT token.
    Returns None if no valid token is provided (for optional auth routes).
    """
    if not authorization:
        return None

    # Handle "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1]

    try:
        payload = decode_jwt_token(token)
        return extract_subject_from_payload(payload)
    except HTTPException:
        return None


async def require_auth(
    authorization: str = Header(..., alias="Authorization")
) -> Subject:
    """
    Dependency that requires authentication.
    Raises 401 if token is missing or invalid.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Handle "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    payload = decode_jwt_token(token)
    return extract_subject_from_payload(payload)


async def require_mfa(
    subject: Subject = Depends(require_auth)
) -> Subject:
    """
    Dependency that requires MFA verification if MFA is enabled.
    """
    if subject.mfa_enabled and not subject.mfa_verified:
        raise HTTPException(
            status_code=403,
            detail="MFA verification required",
        )
    return subject


async def require_platform_admin(
    subject: Subject = Depends(require_auth)
) -> Subject:
    """
    Dependency that requires platform admin role (ADMIN or SUPERADMIN).
    """
    if not subject.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Platform admin access required",
        )
    return subject


async def require_superadmin(
    subject: Subject = Depends(require_auth)
) -> Subject:
    """
    Dependency that requires superadmin role.
    """
    if not subject.is_superadmin:
        raise HTTPException(
            status_code=403,
            detail="Superadmin access required",
        )
    return subject


def require_org_role(allowed_roles: List[str]):
    """
    Create a dependency that requires specific organization roles.

    Usage:
        @app.get("/org/{org_id}/admin")
        async def admin_endpoint(
            org_id: str,
            subject: Subject = Depends(require_org_role(["OWNER", "ADMIN"]))
        ):
            pass
    """
    async def dependency(
        org_id: str,
        subject: Subject = Depends(require_auth)
    ) -> Subject:
        # Platform admins can access any org
        if subject.is_admin:
            return subject

        # Check org membership
        if not subject.has_org_role(org_id, allowed_roles):
            raise HTTPException(
                status_code=403,
                detail=f"Requires one of these roles in organization: {', '.join(allowed_roles)}",
            )
        return subject

    return dependency


# Common role requirement shortcuts
require_org_owner = require_org_role(["OWNER"])
require_org_admin = require_org_role(["OWNER", "ADMIN"])
require_org_manager = require_org_role(["OWNER", "ADMIN", "MANAGER"])
require_org_staff = require_org_role(["OWNER", "ADMIN", "MANAGER", "STAFF"])
require_org_member = require_org_role(["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"])


class AuthMiddleware:
    """
    Middleware to attach subject to request state for global access.
    """

    async def __call__(self, request: Request, call_next):
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization", "")

        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                try:
                    payload = decode_jwt_token(parts[1])
                    subject = extract_subject_from_payload(payload)
                    request.state.subject = subject
                except Exception:
                    request.state.subject = None
            else:
                request.state.subject = None
        else:
            request.state.subject = None

        response = await call_next(request)
        return response


def get_subject_from_request(request: Request) -> Optional[Subject]:
    """Get subject from request state (set by AuthMiddleware)"""
    return getattr(request.state, "subject", None)
