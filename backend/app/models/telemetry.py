"""
Telemetry Domain Models (Pydantic)
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class BGPSessionState(BaseModel):
    peer_id: str
    peer_ip: str
    remote_asn: int
    session_type: str
    state: str  # Established, Active, Idle, OpenSent, Connect
    prefixes_received: int
    uptime_seconds: int
    flap_count: int
    last_flap: Optional[str] = None

class NodeTelemetry(BaseModel):
    node_id: str
    hostname: str
    role: str
    timestamp: str
    cpu_util_pct: float
    memory_util_pct: float
    temperature_c: float
    active_flows_count: int
    buffer_discards_sec: float
    bgp_sessions: List[BGPSessionState] = []
    status: str = "ONLINE"  # ONLINE, DEGRADED, OFFLINE

class LinkTelemetry(BaseModel):
    link_id: str
    name: str
    layer: str  # UNDERLAY, OVERLAY
    source: str
    target: str
    timestamp: str
    status: str  # UP, DEGRADED, DOWN
    latency_ms: float
    jitter_ms: float
    packet_loss_pct: float
    tx_bps: float
    rx_bps: float
    tx_util_pct: float
    rx_util_pct: float
    buffer_discards_sec: float
    sla_state: str  # HEALTHY, WARNING, BREACHED
    sla_breach_reasons: List[str] = []

class IPFIXFlow(BaseModel):
    flow_id: str
    timestamp: str
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str  # TCP, UDP, ESP, ICMP
    dscp: str      # EF, AF41, AF31, CS0, BE
    app_tag: str   # VoIP_SIP, VideoConf_Teams, ERP_SAP, Backup_Replication, OSPF_Control
    bytes_sec: float
    packets_sec: float

class AlertEvent(BaseModel):
    id: str
    timestamp: str
    severity: str  # CRITICAL, WARNING, INFO
    component_type: str  # NODE, LINK, BGP, IPSEC
    component_id: str
    title: str
    description: str
    recommended_runbook_id: Optional[str] = None

class TelemetryLiveSnapshot(BaseModel):
    timestamp: str
    tick_count: int
    total_nodes: int
    total_links: int
    healthy_links: int
    degraded_links: int
    breached_links: int
    nodes: Dict[str, NodeTelemetry]
    links: Dict[str, LinkTelemetry]
    top_flows: List[IPFIXFlow]
    active_alerts: List[AlertEvent]

class AnomalyInjectionRequest(BaseModel):
    scenario: str  # LATENCY_SPIKE, BGP_FLAP, BUFFER_EXHAUSTION, FIBER_CUT, RECOVERY
    target_id: str  # link_id or node_id
    duration_seconds: Optional[int] = 60
    severity: Optional[str] = "HIGH"
    description: Optional[str] = None
