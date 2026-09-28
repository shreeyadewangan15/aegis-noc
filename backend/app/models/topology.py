"""
Topology Domain Models (Pydantic)
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class InterfaceModel(BaseModel):
    name: str
    ip: str
    speed_gbps: float
    connected_to: Optional[str] = None
    role: str

class BGPPeerModel(BaseModel):
    peer_id: str
    peer_ip: str
    remote_asn: int
    type: str

class GeoLocation(BaseModel):
    lat: float
    lng: float
    city: str
    country: str

class SiteModel(BaseModel):
    id: str
    name: str
    type: str  # DATACENTER, HUB, BRANCH
    geo: GeoLocation
    tier: str
    redundancy: Optional[str] = None
    criticality: Optional[str] = None
    nodes: List[str]

class NodeModel(BaseModel):
    id: str
    hostname: str
    role: str  # CE, PE, P
    site_id: str
    loopback_ip: str
    system_asn: int
    device_model: str
    os_version: str
    interfaces: List[InterfaceModel] = []
    bgp_peers: List[BGPPeerModel] = []

class LinkModel(BaseModel):
    id: str
    name: str
    layer: str  # UNDERLAY, OVERLAY
    source: str
    target: str
    source_interface: str
    target_interface: str
    capacity_mbps: float
    sla_latency_threshold_ms: float
    sla_jitter_threshold_ms: float
    sla_loss_threshold_pct: float
    media: Optional[str] = None
    cost: Optional[int] = 10
    encryption: Optional[str] = None
    underlay_path: Optional[List[str]] = None

class NetworkTopologyPayload(BaseModel):
    network_id: str
    name: str
    version: str
    airgap_status: str
    sites: List[SiteModel]
    nodes: List[NodeModel]
    links: List[LinkModel]
