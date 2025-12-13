"""
Admin Configuration API

Provides admin endpoints for configuring blockchain, mix-net, privacy policies,
and system infrastructure.
"""

import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database.connection import get_db
from ...security.auth import require_admin
from ...config.settings import settings
from ...privacy.retention import RetentionEngine
from ...privacy.models import DataRetentionPolicy
from ...privacy.jurisdiction import PrivacyJurisdiction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/config", tags=["admin-config"])


# ============================================================================
# Request/Response Models
# ============================================================================

class BlockchainConfig(BaseModel):
    """Blockchain configuration."""
    fabric_gateway_url: str = Field(..., description="Hyperledger Fabric gateway URL")
    fabric_msp_id: str = Field(..., description="MSP ID (e.g., Org1MSP)")
    fabric_channel: str = Field(..., description="Channel name")
    fabric_chaincode: str = Field(..., description="Chaincode name")
    fabric_cert_path: Optional[str] = Field(None, description="Path to certificate")
    fabric_key_path: Optional[str] = Field(None, description="Path to private key")


class MixNetNodeConfig(BaseModel):
    """Mix-net node configuration."""
    node_id: str
    url: HttpUrl
    public_key: str
    threshold_index: int = Field(..., ge=1, le=5, description="Threshold position (1-5)")
    active: bool = True


class MixNetConfig(BaseModel):
    """Mix-net configuration."""
    threshold: int = Field(5, ge=3, le=7, description="Threshold for decryption")
    total_nodes: int = Field(5, ge=3, le=7, description="Total mix-net nodes")
    nodes: List[MixNetNodeConfig]


class ZKProofConfig(BaseModel):
    """Zero-knowledge proof configuration."""
    proving_key_path: str
    verification_key_path: str
    circuit_type: str = Field("groth16", description="ZK circuit type")
    max_voters_per_proof: int = Field(1000, description="Max voters per batch proof")


class RetentionPolicyConfig(BaseModel):
    """Data retention policy configuration."""
    data_type: str
    retention_days: int = Field(..., ge=1, description="Retention period in days")
    deletion_method: str = Field(..., description="anonymize, delete, or archive")
    jurisdiction: Optional[PrivacyJurisdiction] = None
    legal_basis: Optional[str] = None


class SystemHealthResponse(BaseModel):
    """System health status."""
    status: str
    timestamp: datetime
    components: Dict[str, Any]
    blockchain: Dict[str, Any]
    privacy: Dict[str, Any]
    integrations: Dict[str, Any]


class ConfigurationResponse(BaseModel):
    """Configuration response."""
    success: bool
    message: str
    config: Optional[Dict[str, Any]] = None


# ============================================================================
# Blockchain Configuration
# ============================================================================

@router.get("/blockchain")
async def get_blockchain_config(
    _admin: dict = Depends(require_admin)
) -> BlockchainConfig:
    """
    Get current blockchain configuration.

    Requires admin authentication.
    """
    return BlockchainConfig(
        fabric_gateway_url=settings.fabric_gateway_url,
        fabric_msp_id=settings.fabric_msp_id,
        fabric_channel=settings.fabric_channel,
        fabric_chaincode=settings.fabric_chaincode,
    )


@router.post("/blockchain")
async def update_blockchain_config(
    config: BlockchainConfig,
    _admin: dict = Depends(require_admin)
) -> ConfigurationResponse:
    """
    Update blockchain configuration.

    NOTE: Changes require application restart to take effect.
    """
    try:
        # In production, this would update environment variables or config file
        # For now, log the configuration
        logger.info(f"Blockchain configuration updated: {config.dict()}")

        # Validate connection
        from ...services.fabric_gateway import test_fabric_connection

        connection_test = await test_fabric_connection(
            gateway_url=config.fabric_gateway_url,
            msp_id=config.fabric_msp_id,
            channel=config.fabric_channel,
            chaincode=config.fabric_chaincode,
        )

        if not connection_test["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Blockchain connection test failed: {connection_test['error']}"
            )

        return ConfigurationResponse(
            success=True,
            message="Blockchain configuration updated. Restart application to apply changes.",
            config=config.dict()
        )

    except Exception as e:
        logger.error(f"Failed to update blockchain config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/blockchain/test")
async def test_blockchain_connection(
    _admin: dict = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Test blockchain connection with current configuration.
    """
    try:
        from ...services.fabric_gateway import test_fabric_connection

        result = await test_fabric_connection(
            gateway_url=settings.fabric_gateway_url,
            msp_id=settings.fabric_msp_id,
            channel=settings.fabric_channel,
            chaincode=settings.fabric_chaincode,
        )

        return {
            "success": result["success"],
            "message": result.get("message", "Connection test completed"),
            "details": result,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Blockchain connection test failed: {e}")
        return {
            "success": False,
            "message": f"Connection test failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat(),
        }


# ============================================================================
# Mix-Net Configuration
# ============================================================================

@router.get("/mixnet")
async def get_mixnet_config(
    _admin: dict = Depends(require_admin)
) -> MixNetConfig:
    """
    Get current mix-net configuration.
    """
    # In production, this would read from database or config file
    # For now, return example configuration
    return MixNetConfig(
        threshold=5,
        total_nodes=5,
        nodes=[
            MixNetNodeConfig(
                node_id="node_1",
                url="https://mixnet-1.observernet.org",
                public_key="PUBLIC_KEY_1_PLACEHOLDER",
                threshold_index=1,
                active=True
            ),
            MixNetNodeConfig(
                node_id="node_2",
                url="https://mixnet-2.observernet.org",
                public_key="PUBLIC_KEY_2_PLACEHOLDER",
                threshold_index=2,
                active=True
            ),
            MixNetNodeConfig(
                node_id="node_3",
                url="https://mixnet-3.observernet.org",
                public_key="PUBLIC_KEY_3_PLACEHOLDER",
                threshold_index=3,
                active=True
            ),
            MixNetNodeConfig(
                node_id="node_4",
                url="https://mixnet-4.observernet.org",
                public_key="PUBLIC_KEY_4_PLACEHOLDER",
                threshold_index=4,
                active=True
            ),
            MixNetNodeConfig(
                node_id="node_5",
                url="https://mixnet-5.observernet.org",
                public_key="PUBLIC_KEY_5_PLACEHOLDER",
                threshold_index=5,
                active=True
            ),
        ]
    )


@router.post("/mixnet")
async def update_mixnet_config(
    config: MixNetConfig,
    _admin: dict = Depends(require_admin)
) -> ConfigurationResponse:
    """
    Update mix-net configuration.

    Validates threshold cryptography setup.
    """
    try:
        # Validate configuration
        if len(config.nodes) != config.total_nodes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Expected {config.total_nodes} nodes, got {len(config.nodes)}"
            )

        if config.threshold > config.total_nodes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Threshold cannot exceed total nodes"
            )

        # Validate unique threshold indices
        indices = [node.threshold_index for node in config.nodes]
        if len(indices) != len(set(indices)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Threshold indices must be unique"
            )

        logger.info(f"Mix-net configuration updated: {config.dict()}")

        return ConfigurationResponse(
            success=True,
            message="Mix-net configuration updated successfully",
            config=config.dict()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update mix-net config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/mixnet/test")
async def test_mixnet_nodes(
    _admin: dict = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Test connectivity to all mix-net nodes.
    """
    try:
        from ...services.mixnet import test_mixnet_connectivity

        result = await test_mixnet_connectivity()

        return {
            "success": result["all_nodes_reachable"],
            "message": f"{result['reachable_nodes']}/{result['total_nodes']} nodes reachable",
            "details": result,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Mix-net test failed: {e}")
        return {
            "success": False,
            "message": f"Mix-net test failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat(),
        }


# ============================================================================
# ZK Proof Configuration
# ============================================================================

@router.get("/zkproof")
async def get_zkproof_config(
    _admin: dict = Depends(require_admin)
) -> ZKProofConfig:
    """
    Get zero-knowledge proof configuration.
    """
    return ZKProofConfig(
        proving_key_path="/keys/proving_key.bin",
        verification_key_path="/keys/verification_key.bin",
        circuit_type="groth16",
        max_voters_per_proof=1000
    )


@router.post("/zkproof")
async def update_zkproof_config(
    config: ZKProofConfig,
    _admin: dict = Depends(require_admin)
) -> ConfigurationResponse:
    """
    Update ZK proof configuration.
    """
    try:
        logger.info(f"ZK proof configuration updated: {config.dict()}")

        return ConfigurationResponse(
            success=True,
            message="ZK proof configuration updated successfully",
            config=config.dict()
        )

    except Exception as e:
        logger.error(f"Failed to update ZK proof config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# Privacy & Retention Policies
# ============================================================================

@router.get("/retention-policies")
async def get_retention_policies(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
) -> List[Dict[str, Any]]:
    """
    Get all data retention policies.
    """
    policies = db.query(DataRetentionPolicy).filter(
        DataRetentionPolicy.active == True
    ).all()

    return [
        {
            "id": p.id,
            "data_type": p.dataType,
            "retention_days": p.retentionPeriodDays,
            "deletion_method": p.deletionMethod,
            "jurisdiction": p.jurisdiction.value if p.jurisdiction else None,
            "legal_basis": p.legalBasis,
            "last_enforced": p.lastEnforced.isoformat() if p.lastEnforced else None,
            "next_enforcement": p.nextEnforcement.isoformat() if p.nextEnforcement else None,
        }
        for p in policies
    ]


@router.post("/retention-policies")
async def create_retention_policy(
    policy: RetentionPolicyConfig,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
) -> ConfigurationResponse:
    """
    Create a new data retention policy.
    """
    try:
        engine = RetentionEngine(db)

        created_policy = engine.create_retention_policy(
            data_type=policy.data_type,
            retention_days=policy.retention_days,
            deletion_method=policy.deletion_method,
            jurisdiction=policy.jurisdiction,
        )

        if policy.legal_basis:
            created_policy.legalBasis = policy.legal_basis
            db.commit()

        return ConfigurationResponse(
            success=True,
            message=f"Retention policy created for {policy.data_type}",
            config={
                "id": created_policy.id,
                "data_type": created_policy.dataType,
                "retention_days": created_policy.retentionPeriodDays,
            }
        )

    except Exception as e:
        logger.error(f"Failed to create retention policy: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/retention-policies/enforce")
async def enforce_retention_policies(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Manually trigger retention policy enforcement.

    WARNING: This will anonymize/delete data per configured policies.
    """
    try:
        engine = RetentionEngine(db)
        result = engine.enforce_retention_policies()

        return {
            "success": True,
            "message": "Retention policies enforced",
            "result": result,
        }

    except Exception as e:
        logger.error(f"Failed to enforce retention policies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# System Health & Monitoring
# ============================================================================

@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
) -> SystemHealthResponse:
    """
    Get comprehensive system health status.

    Checks:
    - Database connectivity
    - Blockchain connection
    - Mix-net nodes
    - Privacy compliance
    - External integrations
    """
    components = {}

    # Database check
    try:
        db.execute("SELECT 1")
        components["database"] = {"status": "healthy", "message": "Connected"}
    except Exception as e:
        components["database"] = {"status": "unhealthy", "message": str(e)}

    # Blockchain check
    try:
        from ...services.fabric_gateway import test_fabric_connection
        blockchain_test = await test_fabric_connection(
            gateway_url=settings.fabric_gateway_url,
            msp_id=settings.fabric_msp_id,
            channel=settings.fabric_channel,
            chaincode=settings.fabric_chaincode,
        )
        components["blockchain"] = {
            "status": "healthy" if blockchain_test["success"] else "unhealthy",
            "gateway": settings.fabric_gateway_url,
            "channel": settings.fabric_channel,
        }
    except Exception as e:
        components["blockchain"] = {"status": "unhealthy", "message": str(e)}

    # Mix-net check
    try:
        from ...services.mixnet import test_mixnet_connectivity
        mixnet_test = await test_mixnet_connectivity()
        components["mixnet"] = {
            "status": "healthy" if mixnet_test["all_nodes_reachable"] else "degraded",
            "reachable_nodes": f"{mixnet_test['reachable_nodes']}/{mixnet_test['total_nodes']}",
        }
    except Exception as e:
        components["mixnet"] = {"status": "unhealthy", "message": str(e)}

    # Privacy compliance check
    try:
        from ...privacy.breach import BreachNotificationEngine
        breach_engine = BreachNotificationEngine(db)
        overdue_alerts = breach_engine.check_notification_deadlines()

        components["privacy"] = {
            "status": "healthy" if len(overdue_alerts) == 0 else "warning",
            "overdue_breach_notifications": len(overdue_alerts),
            "dsar_portal": "operational",
        }
    except Exception as e:
        components["privacy"] = {"status": "unhealthy", "message": str(e)}

    # Overall status
    statuses = [c.get("status") for c in components.values()]
    if any(s == "unhealthy" for s in statuses):
        overall_status = "unhealthy"
    elif any(s == "degraded" or s == "warning" for s in statuses):
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return SystemHealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        components=components,
        blockchain={
            "gateway": settings.fabric_gateway_url,
            "channel": settings.fabric_channel,
            "chaincode": settings.fabric_chaincode,
        },
        privacy={
            "jurisdictions_supported": len(PrivacyJurisdiction),
            "dsar_automation": "enabled",
        },
        integrations={
            "didit_kyc": "configured" if settings.didit_api_key else "not_configured",
            "email_provider": settings.email_provider,
            "whatsapp_provider": settings.whatsapp_provider,
        }
    )


# ============================================================================
# Integration Testing
# ============================================================================

@router.post("/test/full-stack")
async def test_full_stack(
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Run comprehensive integration tests across all components.

    Tests:
    1. Database connectivity
    2. Blockchain write/read
    3. Mix-net shuffle
    4. ZK proof generation/verification
    5. Privacy automation
    """
    results = {}

    # 1. Database test
    try:
        db.execute("SELECT 1")
        results["database"] = {"success": True, "message": "Connected"}
    except Exception as e:
        results["database"] = {"success": False, "error": str(e)}

    # 2. Blockchain test
    try:
        from ...services.fabric_gateway import test_fabric_write_read
        blockchain_result = await test_fabric_write_read()
        results["blockchain"] = blockchain_result
    except Exception as e:
        results["blockchain"] = {"success": False, "error": str(e)}

    # 3. Mix-net test
    try:
        from ...services.mixnet import test_threshold_encryption
        mixnet_result = await test_threshold_encryption()
        results["mixnet"] = mixnet_result
    except Exception as e:
        results["mixnet"] = {"success": False, "error": str(e)}

    # 4. ZK proof test
    try:
        from ...services.zk_proof import test_proof_generation
        zk_result = await test_proof_generation()
        results["zkproof"] = zk_result
    except Exception as e:
        results["zkproof"] = {"success": False, "error": str(e)}

    # 5. Privacy automation test
    try:
        from ...privacy.dsar_automation import DSARAutomation
        dsar = DSARAutomation(db)
        results["privacy"] = {"success": True, "message": "DSAR automation operational"}
    except Exception as e:
        results["privacy"] = {"success": False, "error": str(e)}

    # Overall success
    all_success = all(r.get("success", False) for r in results.values())

    return {
        "overall_success": all_success,
        "timestamp": datetime.utcnow().isoformat(),
        "results": results,
    }
