// TypeScript definitions for SD-WAN over MPLS NOC Dashboard & AI Copilot

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
}

export interface Site {
  id: string;
  name: string;
  type: 'DATACENTER' | 'HUB' | 'BRANCH';
  geo: GeoLocation;
  tier: string;
  redundancy?: string;
  criticality?: string;
  nodes: string[];
}

export interface NodeInterface {
  name: string;
  ip: string;
  speed_gbps: number;
  connected_to?: string;
  role: string;
}

export interface BGPPeer {
  peer_id: string;
  peer_ip: string;
  remote_asn: number;
  type: string;
}

export interface NetworkNode {
  id: string;
  hostname: string;
  role: 'CE' | 'PE' | 'P';
  site_id: string;
  loopback_ip: string;
  system_asn: number;
  device_model: string;
  os_version: string;
  interfaces: NodeInterface[];
  bgp_peers: BGPPeer[];
}

export interface NetworkLink {
  id: string;
  name: string;
  layer: 'UNDERLAY' | 'OVERLAY';
  source: string;
  target: string;
  source_interface: string;
  target_interface: string;
  capacity_mbps: number;
  sla_latency_threshold_ms: number;
  sla_jitter_threshold_ms: number;
  sla_loss_threshold_pct: number;
  media?: string;
  cost?: number;
  encryption?: string;
  underlay_path?: string[];
}

export interface NetworkTopology {
  network_id: string;
  name: string;
  version: string;
  airgap_status: string;
  sites: Site[];
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface BGPSessionState {
  peer_id: string;
  peer_ip: string;
  remote_asn: number;
  session_type: string;
  state: 'Established' | 'Active' | 'Idle' | 'OpenSent' | 'Connect';
  prefixes_received: number;
  uptime_seconds: number;
  flap_count: number;
  last_flap: string | null;
}

export interface NodeTelemetry {
  node_id: string;
  hostname: string;
  role: string;
  timestamp: string;
  cpu_util_pct: number;
  memory_util_pct: number;
  temperature_c: number;
  active_flows_count: number;
  buffer_discards_sec: number;
  bgp_sessions: BGPSessionState[];
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
}

export interface LinkTelemetry {
  link_id: string;
  name: string;
  layer: 'UNDERLAY' | 'OVERLAY';
  source: string;
  target: string;
  timestamp: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  latency_ms: number;
  jitter_ms: number;
  packet_loss_pct: number;
  tx_bps: number;
  rx_bps: number;
  tx_util_pct: number;
  rx_util_pct: number;
  buffer_discards_sec: number;
  sla_state: 'HEALTHY' | 'WARNING' | 'BREACHED';
  sla_breach_reasons: string[];
}

export interface IPFIXFlow {
  flow_id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  dscp: string;
  app_tag: string;
  bytes_sec: number;
  packets_sec: number;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  component_type: 'NODE' | 'LINK' | 'BGP' | 'IPSEC';
  component_id: string;
  title: string;
  description: string;
  recommended_runbook_id?: string;
}

export interface TelemetryLiveSnapshot {
  timestamp: string;
  tick_count: number;
  total_nodes: number;
  total_links: number;
  healthy_links: number;
  degraded_links: number;
  breached_links: number;
  active_anomalies_count: number;
  active_anomalies: Array<{ id: string; scenario: string; target_id: string; remaining: number }>;
  nodes: Record<string, NodeTelemetry>;
  links: Record<string, LinkTelemetry>;
  top_flows: IPFIXFlow[];
  active_alerts: AlertEvent[];
}

export interface HealthStatus {
  status: string;
  airgap_enforced: boolean;
  airgap_mode: string;
  blocked_outbound_egress_attempts: number;
  allowed_local_connections: number;
  uptime_seconds: number;
  telemetry_daemon_running: boolean;
  telemetry_ticks: number;
  active_anomalies_count: number;
  database: {
    engine: string;
    air_gapped_persistence: boolean;
    total_persisted_node_metrics: number;
    total_persisted_link_metrics: number;
  };
}

export interface Runbook {
  id: string;
  title: string;
  trigger_symptoms: string[];
  root_cause_categories: string[];
  triage_steps: string[];
  remediation_actions: string[];
  blast_radius_impact: string;
  similarity_score?: number;
}

export interface PrecursorAlert {
  precursor_type: string;
  target_id: string;
  target_type: 'LINK' | 'NODE';
  predicted_failure: string;
  time_to_impact_seconds: number;
  time_to_impact: string;
  confidence_score: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  signals_observed: string[];
  affected_nodes_and_services: string[];
  root_cause_hypothesis: string;
  recommended_sop_id: string;
  metrics_snapshot: Record<string, any>;
  timestamp: string;
}

export interface PrecursorsPayload {
  timestamp: string;
  overall_network_risk_score: number;
  risk_level: 'NORMAL' | 'MODERATE' | 'ELEVATED';
  precursors_detected_count: number;
  precursors: PrecursorAlert[];
}

export interface StructuredCopilotResponse {
  predicted_issue: string;
  time_to_impact: string;
  time_to_impact_seconds?: number;
  confidence: number;
  signals_observed: string[];
  affected_nodes_and_services: string[];
  root_cause_hypothesis: string;
  recommended_actions: string[];
  automation_runbook_id: string;
  overall_risk_score?: number;
  inference_engine?: string;
}
