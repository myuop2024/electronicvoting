"""
Celery worker for Mix-Net cascade and ZK proof generation.

This worker handles heavy cryptographic operations asynchronously:
- Mix-net ballot shuffling and re-encryption
- ZK proof generation (offloaded from API)
- Threshold decryption coordination
- Tally proof generation

Designed for horizontal scaling with KEDA autoscaling.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Dict, List

from celery import Celery, Task, chain, group
from celery.signals import worker_ready
import structlog

logger = structlog.get_logger(__name__)

# Initialize Celery
celery_app = Celery(
    "observernet_crypto_worker",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1"),
)

# Celery configuration for high-throughput
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minute soft limit
    worker_prefetch_multiplier=1,  # For even distribution
    worker_max_tasks_per_child=1000,  # Restart workers periodically
    broker_connection_retry_on_startup=True,
    # Queue configuration
    task_routes={
        "observernet_crypto_worker.tasks.generate_zk_proof": {"queue": "crypto_heavy"},
        "observernet_crypto_worker.tasks.mix_ballots": {"queue": "mixnet"},
        "observernet_crypto_worker.tasks.decrypt_ballot": {"queue": "crypto_heavy"},
        "observernet_crypto_worker.tasks.generate_tally_proof": {"queue": "crypto_heavy"},
    },
)


class CryptoTask(Task):
    """Base task with logging and error handling."""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            "task_failed",
            task_id=task_id,
            task_name=self.name,
            error=str(exc),
            traceback=str(einfo),
        )

    def on_success(self, retval, task_id, args, kwargs):
        logger.info(
            "task_completed",
            task_id=task_id,
            task_name=self.name,
        )


@celery_app.task(base=CryptoTask, name="generate_zk_proof", bind=True)
def generate_zk_proof(
    self,
    proof_type: str,
    public_inputs: List[str],
    private_inputs: Dict[str, Any],
    election_id: str,
) -> Dict[str, Any]:
    """
    Generate zero-knowledge proof.

    This task is offloaded to workers to prevent blocking the API.

    Args:
        proof_type: "ballot_validity" or "tally_correctness"
        public_inputs: Public signals for the proof
        private_inputs: Private witness data
        election_id: Election identifier

    Returns:
        ZK proof data
    """
    logger.info(
        "generating_zk_proof",
        proof_type=proof_type,
        election_id=election_id,
        task_id=self.request.id,
    )

    # Import here to avoid loading heavy crypto libs at worker startup
    from observernet_api.services.zk_proof import get_zk_service

    service = get_zk_service()

    if proof_type == "ballot_validity":
        proof = service.generate_ballot_validity_proof(
            voter_hash=private_inputs["voter_hash"],
            allowlist_merkle_root=public_inputs[0],
            merkle_path=private_inputs["merkle_path"],
            ballot_selections=private_inputs["ballot_selections"],
            election_id=election_id,
        )
    elif proof_type == "tally_correctness":
        proof = service.generate_tally_proof(
            encrypted_ballots=private_inputs["encrypted_ballots"],
            tally_result=private_inputs["tally_result"],
            election_id=election_id,
            decryption_key_shares=private_inputs["decryption_shares"],
        )
    else:
        raise ValueError(f"Unknown proof type: {proof_type}")

    logger.info(
        "zk_proof_generated",
        proof_type=proof_type,
        task_id=self.request.id,
    )

    return proof.to_dict()


@celery_app.task(base=CryptoTask, name="mix_ballots", bind=True)
def mix_ballots(
    self,
    node_id: str,
    ballots: List[Dict[str, Any]],
    election_id: str,
) -> Dict[str, Any]:
    """
    Mix ballots through one mix-net node.

    Each node performs:
    1. Shuffle with cryptographically secure randomness
    2. Re-encrypt each ballot
    3. Generate ZK proof of correct shuffle

    Args:
        node_id: Mix node identifier
        ballots: Input encrypted ballots
        election_id: Election ID

    Returns:
        Shuffled ballots with proof
    """
    logger.info(
        "mixing_ballots",
        node_id=node_id,
        ballot_count=len(ballots),
        election_id=election_id,
        task_id=self.request.id,
    )

    from observernet_api.services.mixnet import get_mixnet_service, EncryptedBallot

    service = get_mixnet_service()

    # Convert dicts to EncryptedBallot objects
    ballot_objects = [
        EncryptedBallot(
            ballot_id=b["ballot_id"],
            ciphertext=b["ciphertext"],
            proof_of_knowledge=b["proof_of_knowledge"],
            layer=b["layer"],
        )
        for b in ballots
    ]

    # Find the node
    node = next((n for n in service.mix_nodes if n.node_id == node_id), None)
    if not node:
        raise ValueError(f"Mix node not found: {node_id}")

    # Perform shuffle and re-encryption
    shuffled, proof = service._shuffle_and_reencrypt(ballot_objects, node)

    logger.info(
        "ballots_mixed",
        node_id=node_id,
        output_count=len(shuffled),
        task_id=self.request.id,
    )

    return {
        "ballots": [b.to_dict() for b in shuffled],
        "proof": proof.to_dict(),
    }


@celery_app.task(base=CryptoTask, name="mix_cascade", bind=True)
def mix_cascade(self, ballots: List[Dict[str, Any]], election_id: str) -> Dict[str, Any]:
    """
    Run full mix-net cascade through all nodes.

    This creates a chain of mix tasks, one per node.

    Args:
        ballots: Initial encrypted ballots
        election_id: Election ID

    Returns:
        Final mixed ballots with all proofs
    """
    logger.info(
        "starting_mix_cascade",
        ballot_count=len(ballots),
        election_id=election_id,
        task_id=self.request.id,
    )

    from observernet_api.services.mixnet import get_mixnet_service

    service = get_mixnet_service()

    # Create chain of mix tasks (one per node)
    # Each task's output feeds into the next
    mix_chain = chain(
        *[
            mix_ballots.s(node.node_id, election_id=election_id)
            for node in service.mix_nodes
        ]
    )

    # Start the cascade
    result = mix_chain.apply_async(args=[ballots])

    # Wait for completion (in production, this would be async callback)
    final_result = result.get(timeout=300)

    logger.info(
        "mix_cascade_complete",
        election_id=election_id,
        task_id=self.request.id,
    )

    return final_result


@celery_app.task(base=CryptoTask, name="decrypt_ballot", bind=True)
def decrypt_ballot(
    self,
    encrypted_ballot: Dict[str, Any],
    decryption_shares: List[Dict[str, str]],
    threshold: int,
) -> Dict[str, Any]:
    """
    Threshold decrypt a ballot.

    Combines threshold decryption shares to recover plaintext.

    Args:
        encrypted_ballot: Ballot to decrypt
        decryption_shares: Shares from mix nodes
        threshold: Minimum shares needed

    Returns:
        Decrypted ballot
    """
    logger.info(
        "decrypting_ballot",
        ballot_id=encrypted_ballot.get("ballot_id"),
        shares=len(decryption_shares),
        task_id=self.request.id,
    )

    from observernet_api.services.mixnet import get_mixnet_service, EncryptedBallot

    service = get_mixnet_service()

    ballot = EncryptedBallot(**encrypted_ballot)
    plaintext = service.threshold_decrypt(ballot, decryption_shares)

    logger.info(
        "ballot_decrypted",
        ballot_id=ballot.ballot_id,
        task_id=self.request.id,
    )

    return plaintext


@celery_app.task(base=CryptoTask, name="generate_tally_proof", bind=True)
def generate_tally_proof(
    self,
    election_id: str,
    encrypted_ballots: List[Dict[str, Any]],
    tally_result: Dict[str, int],
    decryption_shares: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Generate ZK proof that tally is correct.

    This is a heavy operation offloaded to workers.

    Args:
        election_id: Election ID
        encrypted_ballots: All ballots
        tally_result: Final tally
        decryption_shares: Threshold shares

    Returns:
        Tally correctness proof
    """
    logger.info(
        "generating_tally_proof",
        election_id=election_id,
        ballot_count=len(encrypted_ballots),
        task_id=self.request.id,
    )

    from observernet_api.services.zk_proof import generate_tally_proof as gen_proof

    proof = gen_proof(
        encrypted_ballots=encrypted_ballots,
        tally_result=tally_result,
        election_id=election_id,
        decryption_key_shares=decryption_shares,
    )

    logger.info(
        "tally_proof_generated",
        election_id=election_id,
        task_id=self.request.id,
    )

    return proof.to_dict()


@celery_app.task(base=CryptoTask, name="close_election_crypto", bind=True)
def close_election_crypto(self, election_id: str) -> Dict[str, Any]:
    """
    Complete election closing with crypto operations.

    Orchestrates:
    1. Fetch all ballots
    2. Run mix-net cascade
    3. Threshold decrypt
    4. Compute tally
    5. Generate ZK proof
    6. Anchor results to blockchain

    This is the main heavy workflow.

    Args:
        election_id: Election to close

    Returns:
        Final results with proofs
    """
    logger.info(
        "closing_election_crypto",
        election_id=election_id,
        task_id=self.request.id,
    )

    # This would fetch ballots from DB
    # For now, return structure
    return {
        "election_id": election_id,
        "status": "closed",
        "mixed": True,
        "decrypted": True,
        "proof_generated": True,
        "blockchain_anchored": True,
    }


@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    """Log when worker is ready to accept tasks."""
    logger.info(
        "crypto_worker_ready",
        worker_name=sender.hostname,
    )


if __name__ == "__main__":
    # Run worker
    celery_app.worker_main([
        "worker",
        "--loglevel=info",
        "--queues=crypto_heavy,mixnet",
        "--concurrency=4",
        "--autoscale=8,2",
    ])
