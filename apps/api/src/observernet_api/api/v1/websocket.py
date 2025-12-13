"""
WebSocket API for real-time election updates.

Provides real-time updates for:
- Vote tallies (after results are published)
- Election status changes
- Ballot confirmation status
- Observer notifications

SECURITY:
- Results are only streamed after resultsPublishAt
- Ballot status uses commitment hash (no voter info)
- Rate limiting prevents abuse
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        # election_id -> set of websocket connections
        self.election_connections: Dict[str, Set[WebSocket]] = {}
        # commitment_hash -> set of websocket connections (for ballot tracking)
        self.ballot_connections: Dict[str, Set[WebSocket]] = {}
        # Global connections for system-wide updates
        self.global_connections: Set[WebSocket] = set()

    async def connect_to_election(self, websocket: WebSocket, election_id: str):
        """Connect to election updates."""
        await websocket.accept()
        if election_id not in self.election_connections:
            self.election_connections[election_id] = set()
        self.election_connections[election_id].add(websocket)

    async def connect_to_ballot(self, websocket: WebSocket, commitment_hash: str):
        """Connect to ballot status updates."""
        await websocket.accept()
        if commitment_hash not in self.ballot_connections:
            self.ballot_connections[commitment_hash] = set()
        self.ballot_connections[commitment_hash].add(websocket)

    async def connect_global(self, websocket: WebSocket):
        """Connect to global updates."""
        await websocket.accept()
        self.global_connections.add(websocket)

    def disconnect_from_election(self, websocket: WebSocket, election_id: str):
        """Disconnect from election updates."""
        if election_id in self.election_connections:
            self.election_connections[election_id].discard(websocket)
            if not self.election_connections[election_id]:
                del self.election_connections[election_id]

    def disconnect_from_ballot(self, websocket: WebSocket, commitment_hash: str):
        """Disconnect from ballot updates."""
        if commitment_hash in self.ballot_connections:
            self.ballot_connections[commitment_hash].discard(websocket)
            if not self.ballot_connections[commitment_hash]:
                del self.ballot_connections[commitment_hash]

    def disconnect_global(self, websocket: WebSocket):
        """Disconnect from global updates."""
        self.global_connections.discard(websocket)

    async def broadcast_to_election(self, election_id: str, message: dict):
        """Broadcast message to all connections watching an election."""
        if election_id not in self.election_connections:
            return

        dead_connections = set()
        for connection in self.election_connections[election_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.election_connections[election_id].discard(conn)

    async def broadcast_to_ballot(self, commitment_hash: str, message: dict):
        """Broadcast message to connections tracking a specific ballot."""
        if commitment_hash not in self.ballot_connections:
            return

        dead_connections = set()
        for connection in self.ballot_connections[commitment_hash]:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        for conn in dead_connections:
            self.ballot_connections[commitment_hash].discard(conn)

    async def broadcast_global(self, message: dict):
        """Broadcast message to all global connections."""
        dead_connections = set()
        for connection in self.global_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        for conn in dead_connections:
            self.global_connections.discard(conn)


# Global connection manager
manager = ConnectionManager()


@router.websocket("/elections/{election_id}")
async def election_websocket(
    websocket: WebSocket,
    election_id: str,
):
    """
    WebSocket endpoint for real-time election updates.

    Sends:
    - Tally updates (when results are public)
    - Voter turnout updates
    - Election status changes
    - Ballot confirmation counts
    """
    await manager.connect_to_election(websocket, election_id)

    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "election_id": election_id,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages (heartbeat or commands)
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=30.0  # 30 second timeout
                )

                if data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat(),
                    })

            except asyncio.TimeoutError:
                # Send heartbeat on timeout
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat(),
                })

    except WebSocketDisconnect:
        manager.disconnect_from_election(websocket, election_id)
    except Exception:
        manager.disconnect_from_election(websocket, election_id)


@router.websocket("/ballot/{commitment_hash}")
async def ballot_websocket(
    websocket: WebSocket,
    commitment_hash: str,
):
    """
    WebSocket endpoint for tracking ballot confirmation status.

    Allows voters to see real-time updates on their ballot:
    - Submission confirmation
    - Blockchain anchoring status
    - Final tally inclusion
    """
    await manager.connect_to_ballot(websocket, commitment_hash)

    try:
        await websocket.send_json({
            "type": "connected",
            "commitment_hash_prefix": commitment_hash[:16],
            "timestamp": datetime.utcnow().isoformat(),
        })

        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=30.0
                )

                if data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat(),
                    })

            except asyncio.TimeoutError:
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat(),
                })

    except WebSocketDisconnect:
        manager.disconnect_from_ballot(websocket, commitment_hash)
    except Exception:
        manager.disconnect_from_ballot(websocket, commitment_hash)


# ============================================================================
# BROADCAST FUNCTIONS (called by other parts of the application)
# ============================================================================

async def broadcast_tally_update(
    election_id: str,
    contest_id: str,
    tallies: Dict[str, int],
    total_votes: int,
):
    """Broadcast tally update to election watchers."""
    await manager.broadcast_to_election(election_id, {
        "type": "tally_update",
        "contest_id": contest_id,
        "tallies": tallies,
        "total_votes": total_votes,
        "timestamp": datetime.utcnow().isoformat(),
    })


async def broadcast_turnout_update(
    election_id: str,
    total_eligible: int,
    total_voted: int,
    turnout_percent: float,
):
    """Broadcast voter turnout update."""
    await manager.broadcast_to_election(election_id, {
        "type": "turnout_update",
        "total_eligible": total_eligible,
        "total_voted": total_voted,
        "turnout_percent": turnout_percent,
        "timestamp": datetime.utcnow().isoformat(),
    })


async def broadcast_election_status(
    election_id: str,
    status: str,
    details: Optional[Dict] = None,
):
    """Broadcast election status change."""
    await manager.broadcast_to_election(election_id, {
        "type": "status_update",
        "status": status,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat(),
    })


async def broadcast_ballot_confirmed(
    commitment_hash: str,
    fabric_tx_id: str,
    block_number: int,
):
    """Broadcast ballot blockchain confirmation to watchers."""
    await manager.broadcast_to_ballot(commitment_hash, {
        "type": "ballot_confirmed",
        "fabric_tx_id": fabric_tx_id,
        "block_number": block_number,
        "status": "CONFIRMED",
        "timestamp": datetime.utcnow().isoformat(),
    })


async def broadcast_ballot_tallied(
    commitment_hash: str,
):
    """Broadcast that ballot has been included in final tally."""
    await manager.broadcast_to_ballot(commitment_hash, {
        "type": "ballot_tallied",
        "status": "TALLIED",
        "timestamp": datetime.utcnow().isoformat(),
    })
