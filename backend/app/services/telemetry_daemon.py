"""
Real-Time Telemetry Generator Daemon (1Hz)
Simulates high-fidelity multi-tier network telemetry for SD-WAN over MPLS:
- CE, PE, and P router SNMP metrics (CPU, RAM, Temp, Interface Discards, Buffer drops)
- BGP session state machines (Established, OpenSent, Active, Flap counters)
- Link SLA metrics (Latency, Jitter drift, Packet loss, Tx/Rx utilization)
- IPFIX flow records (Voice EF, Video AF41, Data CS0)
- IPSec DMVPN tunnel health
- Operator Chaos Scenarios:
  1. Progressive Congestion Buildup on Hub-to-Spoke link
  2. BGP Route Flapping & Convergence Storm
  3. Intermittent MPLS Underlay Flapping with Tunnel Fallback
  4. Controller Misconfiguration & Policy Drift
"""

import asyncio
import random
import time
import datetime
import logging
import uuid
from typing import Dict, Any, List, Optional, Callable
from app.services.topology_engine import topology_engine
from app.services.time_series_store import ts_store
from app.core.config import TELEMETRY_INTERVAL_SECONDS, SLA_MAX_LATENCY_MS, SLA_MAX_JITTER_MS, SLA_MAX_LOSS_PCT

logger = logging.getLogger("TelemetryDaemon")

class ActiveAnomaly:
    def __init__(self, scenario: str, target_id: str, duration: int, severity: str = "HIGH"):
        self.scenario = scenario
        self.target_id = target_id
        self.duration = duration
        self.remaining = duration
        self.elapsed = 0
        self.severity = severity
        self.id = str(uuid.uuid4())[:8]

class TelemetryDaemon:
    def __init__(self):
        self.running = False
        self.tick_count = 0
        self.subscribers: List[Callable[[Dict[str, Any]], None]] = []
        self.active_anomalies: Dict[str, ActiveAnomaly] = {}
        
        # Stateful link metrics for realistic smoothing & drifting
        self.link_states: Dict[str, Dict[str, Any]] = {}
        # Stateful node metrics
        self.node_states: Dict[str, Dict[str, Any]] = {}
        # Recent snapshot cache
        self.latest_snapshot: Optional[Dict[str, Any]] = None
        self._init_states()

    def _init_states(self):
        raw = topology_engine.get_raw_topology()
        for node in raw.get("nodes", []):
            node_id = node["id"]
            role = node.get("role", "CE")
            base_cpu = 18.0 if role == "P" else 24.0 if role == "PE" else 32.0
            
            # Init BGP session state
            bgp_sessions = []
            for peer in node.get("bgp_peers", []):
                bgp_sessions.append({
                    "peer_id": peer["peer_id"],
                    "peer_ip": peer["peer_ip"],
                    "remote_asn": peer["remote_asn"],
                    "session_type": peer["type"],
                    "state": "Established",
                    "prefixes_received": 142 if role == "PE" else 48,
                    "uptime_seconds": 348200,
                    "flap_count": 0,
                    "last_flap": None
                })

            self.node_states[node_id] = {
                "node_id": node_id,
                "hostname": node["hostname"],
                "role": role,
                "cpu_util_pct": base_cpu,
                "memory_util_pct": 42.5,
                "temperature_c": 38.0,
                "active_flows_count": 2100 if role == "P" else 850 if role == "PE" else 320,
                "buffer_discards_sec": 0.0,
                "bgp_sessions": bgp_sessions,
                "status": "ONLINE"
            }

        for link in raw.get("links", []):
            link_id = link["id"]
            layer = link.get("layer", "UNDERLAY")
            sla_lat = link.get("sla_latency_threshold_ms", 25.0)
            
            # Natural base latency depending on topology layer
            if "DCI" in link_id:
                base_lat = 0.8
            elif layer == "UNDERLAY" and "CORE" in link_id:
                base_lat = sla_lat * 0.4
            elif layer == "UNDERLAY":
                base_lat = sla_lat * 0.55
            else: # OVERLAY
                base_lat = sla_lat * 0.65

            self.link_states[link_id] = {
                "link_id": link_id,
                "name": link["name"],
                "layer": layer,
                "source": link["source"],
                "target": link["target"],
                "base_latency": base_lat,
                "current_latency": base_lat,
                "current_jitter": 1.2,
                "current_loss": 0.0,
                "tx_util_pct": 28.0,
                "rx_util_pct": 24.0,
                "tx_bps": link.get("capacity_mbps", 1000) * 1_000_000 * 0.28,
                "rx_bps": link.get("capacity_mbps", 1000) * 1_000_000 * 0.24,
                "buffer_discards_sec": 0.0,
                "sla_state": "HEALTHY",
                "status": "UP"
            }

    def inject_anomaly(self, scenario: str, target_id: str, duration: int = 60, severity: str = "HIGH") -> str:
        anomaly = ActiveAnomaly(scenario=scenario, target_id=target_id, duration=duration, severity=severity)
        self.active_anomalies[anomaly.id] = anomaly
        logger.warning(f"Injected chaos scenario [{scenario}] on target {target_id} (Duration: {duration}s)")
        return anomaly.id

    def clear_anomalies(self):
        self.active_anomalies.clear()
        self._init_states()
        logger.info("Cleared all active anomalies and reset network metrics to baseline.")

    def _generate_ipfix_flows(self, now_iso: str) -> List[Dict[str, Any]]:
        app_profiles = [
            {"tag": "VoIP_SIP_RTP", "proto": "UDP", "dscp": "EF", "src_port": 5060, "dst_port": 16384, "weight": 25},
            {"tag": "VideoConf_Teams", "proto": "UDP", "dscp": "AF41", "src_port": 3478, "dst_port": 50020, "weight": 35},
            {"tag": "ERP_SAP_Production", "proto": "TCP", "dscp": "AF31", "src_port": 3200, "dst_port": 443, "weight": 30},
            {"tag": "DB_Postgres_Sync", "proto": "TCP", "dscp": "AF21", "src_port": 5432, "dst_port": 5432, "weight": 20},
            {"tag": "Backup_Replication", "proto": "TCP", "dscp": "CS0", "src_port": 873, "dst_port": 873, "weight": 40},
            {"tag": "BGP_EVPN_Control", "proto": "TCP", "dscp": "CS6", "src_port": 179, "dst_port": 179, "weight": 5}
        ]
        
        sample_ips = ["10.255.0.1", "10.100.1.2", "10.200.1.2", "10.101.1.2", "10.201.1.2", "10.202.1.2", "10.102.1.2"]
        flows = []
        for app in app_profiles:
            s_ip = random.choice(sample_ips)
            d_ip = random.choice([ip for ip in sample_ips if ip != s_ip])
            rate_mbps = random.uniform(2.5, 45.0) * (app["weight"] / 10.0)
            flows.append({
                "flow_id": f"FL-{random.randint(100000, 999999)}",
                "timestamp": now_iso,
                "src_ip": s_ip,
                "dst_ip": d_ip,
                "src_port": app["src_port"],
                "dst_port": app["dst_port"],
                "protocol": app["proto"],
                "dscp": app["dscp"],
                "app_tag": app["tag"],
                "bytes_sec": round(rate_mbps * 125_000, 0),
                "packets_sec": round(rate_mbps * 120, 0)
            })
        return flows

    def step(self) -> Dict[str, Any]:
        self.tick_count += 1
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now_dt.isoformat()

        # Age and evaluate anomalies
        expired = []
        for a_id, anom in self.active_anomalies.items():
            anom.elapsed += 1
            anom.remaining -= 1
            if anom.remaining <= 0:
                expired.append(a_id)
        for e in expired:
            del self.active_anomalies[e]

        # Generate Node Telemetry
        node_records: Dict[str, Any] = {}
        for node_id, n_state in self.node_states.items():
            # Check if anomaly applies to this node
            node_anomalies = [a for a in self.active_anomalies.values() if a.target_id == node_id]
            
            # Subtle random walk for CPU, RAM, Temp
            cpu = max(5.0, min(99.0, n_state["cpu_util_pct"] + random.uniform(-1.5, 1.5)))
            mem = max(20.0, min(95.0, n_state["memory_util_pct"] + random.uniform(-0.3, 0.3)))
            temp = max(28.0, min(75.0, n_state["temperature_c"] + random.uniform(-0.2, 0.2)))
            discards = 0.0
            status = "ONLINE"

            # Check BGP sessions & Scenarios
            for session in n_state["bgp_sessions"]:
                session["uptime_seconds"] += 1
                bgp_anom = next((a for a in node_anomalies if a.scenario in ["BGP_FLAP", "BGP_CONVERGENCE_STORM"]), None)
                if bgp_anom:
                    session["state"] = random.choice(["OpenSent", "Active", "Idle"])
                    session["flap_count"] += random.randint(1, 3)
                    session["last_flap"] = now_iso
                    cpu = min(96.0, cpu + 35.0)
                    status = "DEGRADED"
                else:
                    session["state"] = "Established"

            buffer_anom = next((a for a in node_anomalies if a.scenario == "BUFFER_EXHAUSTION"), None)
            if buffer_anom:
                cpu = min(98.5, cpu + 45.0)
                discards = random.uniform(450.0, 1850.0)
                status = "DEGRADED"

            n_record = {
                "node_id": node_id,
                "hostname": n_state["hostname"],
                "role": n_state["role"],
                "timestamp": now_iso,
                "cpu_util_pct": round(cpu, 1),
                "memory_util_pct": round(mem, 1),
                "temperature_c": round(temp, 1),
                "active_flows_count": int(n_state["active_flows_count"] + random.randint(-15, 15)),
                "buffer_discards_sec": round(discards, 1),
                "bgp_sessions": n_state["bgp_sessions"],
                "status": status
            }
            node_records[node_id] = n_record
            ts_store.record_node_metric(n_record)

        # Generate Link Telemetry
        link_records: Dict[str, Any] = {}
        healthy_count = 0
        degraded_count = 0
        breached_count = 0
        alerts: List[Dict[str, Any]] = []

        for link_id, l_state in self.link_states.items():
            raw_link = topology_engine.get_link(link_id) or {}
            cap = raw_link.get("capacity_mbps", 1000)
            sla_lat_thresh = raw_link.get("sla_latency_threshold_ms", 30.0)
            sla_jit_thresh = raw_link.get("sla_jitter_threshold_ms", 5.0)
            sla_loss_thresh = raw_link.get("sla_loss_threshold_pct", 0.1)

            # Check anomalies affecting this link
            link_anomalies = [a for a in self.active_anomalies.values() if a.target_id == link_id]
            
            # Gaussian drift
            base_lat = l_state["base_latency"]
            drift = random.gauss(0, 0.4)
            current_lat = max(0.5, base_lat + drift)
            current_jit = max(0.2, 1.2 + random.gauss(0, 0.3))
            current_loss = 0.0
            discards = 0.0
            tx_util = max(5.0, min(95.0, l_state["tx_util_pct"] + random.uniform(-2.0, 2.0)))
            rx_util = max(5.0, min(95.0, l_state["rx_util_pct"] + random.uniform(-2.0, 2.0)))
            status = "UP"
            sla_breach_reasons = []

            for anom in link_anomalies:
                # Scenario 1: Progressive Congestion Buildup on Hub-to-Spoke link
                if anom.scenario == "PROGRESSIVE_CONGESTION":
                    progress = min(1.0, anom.elapsed / max(1.0, anom.duration * 0.7))
                    tx_util = 45.0 + (progress * 52.0) + random.uniform(-1.0, 2.0)
                    rx_util = 40.0 + (progress * 48.0) + random.uniform(-1.0, 2.0)
                    discards = max(0.0, (progress - 0.4) * 600.0 + random.uniform(0, 50))
                    current_lat += (progress * 25.0)
                    current_jit += (progress * 8.0)
                    if tx_util >= 95.0:
                        sla_breach_reasons.append("Line Saturation (95%+ utilization) & Tail Drops")

                # Scenario 2: Latency Spike
                elif anom.scenario == "LATENCY_SPIKE":
                    current_lat += random.uniform(65.0, 140.0)
                    current_jit += random.uniform(18.0, 35.0)
                    current_loss = random.uniform(1.2, 4.5)
                    sla_breach_reasons.append("Extreme Latency/Jitter Spike on Transit Path")

                # Scenario 3: Intermittent MPLS Underlay Flapping with Tunnel Fallback
                elif anom.scenario == "UNDERLAY_FLAP_TUNNEL_FALLBACK":
                    # Intermittent pulse flap
                    if anom.elapsed % 6 < 3:
                        current_loss = random.uniform(8.0, 35.0)
                        current_jit = random.uniform(15.0, 40.0)
                        current_lat += random.uniform(40.0, 90.0)
                        status = "DEGRADED"
                        sla_breach_reasons.append("Underlay Carrier Pulse Flap - Forcing IPSec Dynamic Failover")
                    else:
                        current_loss = 0.5
                        current_lat += 12.0

                # Scenario 4: Controller Misconfiguration & Policy Drift
                elif anom.scenario == "POLICY_DRIFT_MISCONFIG":
                    current_jit += random.uniform(12.0, 28.0)
                    current_loss = random.uniform(1.5, 3.8)
                    tx_util = random.uniform(82.0, 91.0)
                    discards = random.uniform(180.0, 420.0)
                    sla_breach_reasons.append("QoS Policy De-synchronization & DSCP Inversion Drift")

                # Scenario 5: Physical Fiber Cut
                elif anom.scenario == "FIBER_CUT":
                    current_lat = 999.0
                    current_loss = 100.0
                    status = "DOWN"
                    tx_util = 0.0
                    rx_util = 0.0
                    sla_breach_reasons.append("Complete Physical/Transport Fiber Cut")

                # Scenario 6: Buffer Exhaustion
                elif anom.scenario == "BUFFER_EXHAUSTION":
                    tx_util = random.uniform(94.0, 99.8)
                    rx_util = random.uniform(92.0, 99.5)
                    discards = random.uniform(600.0, 3200.0)
                    current_loss = random.uniform(2.0, 6.5)
                    sla_breach_reasons.append("Interface Queue Buffer Exhaustion & Tail Drops")

            # Determine SLA State
            if status == "DOWN":
                sla_state = "BREACHED"
                breached_count += 1
                alerts.append({
                    "id": f"ALT-CUT-{link_id}",
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "component_type": "LINK",
                    "component_id": link_id,
                    "title": f"Link Down: {raw_link.get('name', link_id)}",
                    "description": "Total transport failure detected. Underlay or IPSec overlay tunnel severed.",
                    "recommended_runbook_id": "SOP-MPLS-TE-002"
                })
            elif current_lat > sla_lat_thresh or current_jit > sla_jit_thresh or current_loss > sla_loss_thresh or discards > 100 or tx_util >= 95.0:
                sla_state = "BREACHED"
                breached_count += 1
                if current_lat > sla_lat_thresh:
                    sla_breach_reasons.append(f"Latency {current_lat:.1f}ms exceeds threshold {sla_lat_thresh}ms")
                if current_jit > sla_jit_thresh:
                    sla_breach_reasons.append(f"Jitter {current_jit:.1f}ms exceeds threshold {sla_jit_thresh}ms")
                if discards > 100:
                    sla_breach_reasons.append(f"Buffer Discards ({discards:.0f}/s) causing queue starvation")
                if tx_util >= 95.0:
                    sla_breach_reasons.append(f"Tx Utilization ({tx_util:.1f}%) reached line saturation")

                alerts.append({
                    "id": f"ALT-SLA-{link_id}",
                    "timestamp": now_iso,
                    "severity": "WARNING",
                    "component_type": "LINK",
                    "component_id": link_id,
                    "title": f"SLA Violation: {raw_link.get('name', link_id)}",
                    "description": "; ".join(set(sla_breach_reasons)),
                    "recommended_runbook_id": "SOP-IPSEC-003" if l_state["layer"] == "OVERLAY" else "SOP-MPLS-TE-002"
                })
            elif tx_util > 75.0 or rx_util > 75.0:
                sla_state = "WARNING"
                degraded_count += 1
            else:
                sla_state = "HEALTHY"
                healthy_count += 1

            tx_bps = cap * 1_000_000 * (tx_util / 100.0)
            rx_bps = cap * 1_000_000 * (rx_util / 100.0)

            l_record = {
                "link_id": link_id,
                "name": l_state["name"],
                "layer": l_state["layer"],
                "source": l_state["source"],
                "target": l_state["target"],
                "timestamp": now_iso,
                "status": status,
                "latency_ms": round(current_lat, 2),
                "jitter_ms": round(current_jit, 2),
                "packet_loss_pct": round(current_loss, 3),
                "tx_bps": round(tx_bps, 0),
                "rx_bps": round(rx_bps, 0),
                "tx_util_pct": round(tx_util, 1),
                "rx_util_pct": round(rx_util, 1),
                "buffer_discards_sec": round(discards, 1),
                "sla_state": sla_state,
                "sla_breach_reasons": list(set(sla_breach_reasons))
            }
            link_records[link_id] = l_record
            ts_store.record_link_metric(l_record)

        # Generate IPFIX flows
        flows = self._generate_ipfix_flows(now_iso)

        snapshot = {
            "timestamp": now_iso,
            "tick_count": self.tick_count,
            "total_nodes": len(node_records),
            "total_links": len(link_records),
            "healthy_links": healthy_count,
            "degraded_links": degraded_count,
            "breached_links": breached_count,
            "active_anomalies_count": len(self.active_anomalies),
            "active_anomalies": [
                {"id": a.id, "scenario": a.scenario, "target_id": a.target_id, "remaining": a.remaining, "elapsed": a.elapsed} 
                for a in self.active_anomalies.values()
            ],
            "nodes": node_records,
            "links": link_records,
            "top_flows": flows,
            "active_alerts": alerts
        }
        self.latest_snapshot = snapshot

        # Flush database periodically
        if self.tick_count % 5 == 0:
            ts_store.flush_to_database()

        # Notify callbacks
        for sub in self.subscribers:
            try:
                sub(snapshot)
            except Exception as e:
                logger.error(f"Subscriber error: {e}")

        return snapshot

    def get_latest_snapshot(self) -> Dict[str, Any]:
        if self.latest_snapshot is None:
            return self.step()
        return self.latest_snapshot

    async def run_loop(self):
        self.running = True
        logger.info(">>> Telemetry Generator Daemon started @ 1Hz interval.")
        while self.running:
            try:
                self.step()
            except Exception as e:
                logger.error(f"Telemetry loop iteration error: {e}")
            await asyncio.sleep(TELEMETRY_INTERVAL_SECONDS)

    def stop(self):
        self.running = False
        logger.info("Telemetry Generator Daemon stopped.")

telemetry_daemon = TelemetryDaemon()
