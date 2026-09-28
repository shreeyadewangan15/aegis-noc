"""
Predictive Analytics, Anomaly Injection & Offline RCA Runbook Endpoints
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
from app.services.telemetry_daemon import telemetry_daemon
from app.services.offline_rag_faiss import offline_rag
from app.models.telemetry import AnomalyInjectionRequest

router = APIRouter(prefix="/predictive", tags=["Predictive & Anomaly Engine"])

@router.post("/inject-anomaly")
async def inject_network_anomaly(payload: AnomalyInjectionRequest):
    """
    Injects realistic network failure scenarios:
    - LATENCY_SPIKE: Path degradation, jitter, SLA breach
    - FIBER_CUT: Underlay / Overlay link severance
    - BUFFER_EXHAUSTION: High discards, packet drops, CPU spike
    - BGP_FLAP: Peering state drops to OpenSent/Active
    """
    anomaly_id = telemetry_daemon.inject_anomaly(
        scenario=payload.scenario,
        target_id=payload.target_id,
        duration=payload.duration_seconds or 60,
        severity=payload.severity or "HIGH"
    )
    return {
        "status": "ANOMALY_INJECTED",
        "anomaly_id": anomaly_id,
        "scenario": payload.scenario,
        "target_id": payload.target_id,
        "duration_seconds": payload.duration_seconds or 60
    }

@router.post("/clear-anomalies")
async def clear_all_anomalies():
    """Clears all chaos injections and restores steady-state network metrics."""
    telemetry_daemon.clear_anomalies()
    return {"status": "ALL_ANOMALIES_CLEARED", "network_state": "BASELINE_STABLE"}

@router.get("/runbooks")
async def get_all_runbooks():
    """Returns all offline diagnostic runbooks."""
    return {"count": len(offline_rag.runbooks), "runbooks": offline_rag.runbooks}

@router.post("/rca")
async def perform_offline_rca(query: str = Body(..., embed=True, description="Observed incident symptoms or alert text")):
    """
    Performs 100% offline semantic vector match across local runbooks to provide root-cause analysis.
    """
    results = offline_rag.search(query=query, top_k=3)
    return {
        "query": query,
        "mode": "OFFLINE_LOCAL_VECTOR_MATCH",
        "cloud_leak": False,
        "matched_runbooks": results
    }
