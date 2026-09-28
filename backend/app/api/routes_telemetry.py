"""
Telemetry API Endpoints (Live, History, and SSE Streaming)
"""

import json
import asyncio
from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
from app.services.telemetry_daemon import telemetry_daemon
from app.services.time_series_store import ts_store
from app.models.telemetry import TelemetryLiveSnapshot

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

@router.get("/live", response_model=TelemetryLiveSnapshot)
async def get_live_telemetry():
    """Returns current real-time 1Hz snapshot across all CE, PE, and P nodes and links."""
    return telemetry_daemon.get_latest_snapshot()

@router.get("/history/link/{link_id}")
async def get_link_history(
    link_id: str,
    limit: int = Query(60, ge=5, le=300, description="Number of historical time points (1Hz)")
):
    """Retrieves sliding-window time-series metrics for a specific link."""
    history = ts_store.get_link_history(link_id, limit=limit)
    return {"link_id": link_id, "data_points": len(history), "history": history}

@router.get("/history/node/{node_id}")
async def get_node_history(
    node_id: str,
    limit: int = Query(60, ge=5, le=300, description="Number of historical time points (1Hz)")
):
    """Retrieves sliding-window time-series metrics for a specific router."""
    history = ts_store.get_node_history(node_id, limit=limit)
    return {"node_id": node_id, "data_points": len(history), "history": history}

@router.get("/history/system")
async def get_system_history(
    limit: int = Query(60, ge=5, le=300, description="System-wide aggregated time points")
):
    """Retrieves aggregated historical trend across the entire SD-WAN network."""
    history = ts_store.get_aggregated_system_trend(limit=limit)
    return {"data_points": len(history), "history": history}

@router.get("/stream")
async def stream_telemetry(request: Request):
    """Server-Sent Events (SSE) stream delivering 1Hz live telemetry packets."""
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            snapshot = telemetry_daemon.get_latest_snapshot()
            data_json = json.dumps(snapshot)
            yield f"data: {data_json}\n\n"
            await asyncio.sleep(1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
