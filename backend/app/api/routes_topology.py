"""
Topology API Endpoints
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from app.services.topology_engine import topology_engine
from app.models.topology import NetworkTopologyPayload

router = APIRouter(prefix="/topology", tags=["Topology"])

@router.get("", response_model=NetworkTopologyPayload)
async def get_full_topology():
    """Returns full enterprise SD-WAN over MPLS topology definition."""
    return topology_engine.get_raw_topology()

@router.get("/node/{node_id}")
async def get_node_details(node_id: str):
    """Inspects a specific CE, PE, or P node and its interfaces/BGP neighbors."""
    node = topology_engine.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")
    return node

@router.get("/link/{link_id}")
async def get_link_details(link_id: str):
    """Inspects a specific Underlay or Overlay link."""
    link = topology_engine.get_link(link_id)
    if not link:
        raise HTTPException(status_code=404, detail=f"Link '{link_id}' not found")
    return link

@router.get("/path")
async def calculate_path(
    source: str = Query(..., description="Source Node ID (e.g. BR-NYC-CE-01)"),
    target: str = Query(..., description="Target Node ID (e.g. DC1-CE-01)"),
    layer: str = Query("UNDERLAY", description="Graph layer (UNDERLAY or OVERLAY)")
):
    """Computes Dijkstra shortest path on selected layer."""
    result = topology_engine.compute_shortest_path(source, target, layer)
    if not result.get("found"):
        raise HTTPException(status_code=400, detail=result.get("error", "No path found"))
    return result

@router.get("/blast-radius")
async def calculate_blast_radius(
    target_id: str = Query(..., description="Entity ID to simulate failure on (e.g. PE-01, P-CORE-01, LINK-UND-01)")
):
    """Performs graph-theoretic blast radius failure analysis."""
    result = topology_engine.compute_blast_radius(target_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
