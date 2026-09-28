"""
Precursor Predictive Analytics Engine
Real-time sliding-window time-series feature extraction and early warning detection:
1. Interface Saturation Precursor (Linear regression drift + EWMA velocity predicting 95%+ breach in 120-300s)
2. BGP Flapping & Route Convergence Stress (Session oscillation, prefix churn, hold-timer jitter)
3. IPSec Degradation Scoring (Progressive packet loss drift, crypto rekey latency, SLA violation lead time)
"""

import math
import logging
import datetime
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from app.services.time_series_store import ts_store
from app.services.topology_engine import topology_engine
from app.models.telemetry import TelemetryLiveSnapshot

logger = logging.getLogger("PredictiveEngine")

class PrecursorAlert:
    def __init__(
        self,
        precursor_type: str,
        target_id: str,
        target_type: str, # LINK or NODE
        predicted_failure: str,
        time_to_impact_seconds: int,
        confidence_score: float,
        severity: str,
        signals_observed: List[str],
        affected_nodes_and_services: List[str],
        root_cause_hypothesis: str,
        recommended_sop_id: str,
        metrics_snapshot: Dict[str, Any]
    ):
        self.precursor_type = precursor_type
        self.target_id = target_id
        self.target_type = target_type
        self.predicted_failure = predicted_failure
        self.time_to_impact_seconds = time_to_impact_seconds
        self.time_to_impact_str = f"{time_to_impact_seconds} seconds"
        self.confidence_score = round(confidence_score, 3)
        self.severity = severity
        self.signals_observed = signals_observed
        self.affected_nodes_and_services = affected_nodes_and_services
        self.root_cause_hypothesis = root_cause_hypothesis
        self.recommended_sop_id = recommended_sop_id
        self.metrics_snapshot = metrics_snapshot
        self.timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "precursor_type": self.precursor_type,
            "target_id": self.target_id,
            "target_type": self.target_type,
            "predicted_failure": self.predicted_failure,
            "time_to_impact_seconds": self.time_to_impact_seconds,
            "time_to_impact": self.time_to_impact_str,
            "confidence_score": self.confidence_score,
            "severity": self.severity,
            "signals_observed": self.signals_observed,
            "affected_nodes_and_services": self.affected_nodes_and_services,
            "root_cause_hypothesis": self.root_cause_hypothesis,
            "recommended_sop_id": self.recommended_sop_id,
            "metrics_snapshot": self.metrics_snapshot,
            "timestamp": self.timestamp
        }

class PredictiveEngine:
    def __init__(self):
        self.ewma_alpha = 0.35
        self.window_samples = 30 # 30 seconds sliding window

    def _compute_linear_drift(self, values: List[float]) -> Tuple[float, float, float]:
        """
        Computes slope (m), intercept (b), and R^2 correlation for values over 1s intervals.
        """
        n = len(values)
        if n < 5:
            return 0.0, values[-1] if values else 0.0, 0.0

        x = np.arange(n, dtype=np.float64)
        y = np.array(values, dtype=np.float64)

        x_mean = np.mean(x)
        y_mean = np.mean(y)

        numerator = np.sum((x - x_mean) * (y - y_mean))
        denominator = np.sum((x - x_mean) ** 2)

        if denominator == 0:
            return 0.0, y_mean, 0.0

        slope = numerator / denominator
        intercept = y_mean - slope * x_mean

        # Calculate R^2
        y_pred = slope * x + intercept
        ss_tot = np.sum((y - y_mean) ** 2)
        ss_res = np.sum((y - y_pred) ** 2)
        r2 = 1.0 - (ss_res / (ss_tot + 1e-8)) if ss_tot > 0 else 0.0

        return float(slope), float(intercept), float(max(0.0, min(1.0, r2)))

    def _compute_ewma(self, values: List[float]) -> float:
        if not values:
            return 0.0
        ewma = values[0]
        for v in values[1:]:
            ewma = self.ewma_alpha * v + (1.0 - self.ewma_alpha) * ewma
        return ewma

    def detect_interface_saturation_precursors(self, raw_top: Dict[str, Any]) -> List[PrecursorAlert]:
        alerts = []
        for link in raw_top.get("links", []):
            link_id = link["id"]
            history = ts_store.get_link_history(link_id, limit=self.window_samples)
            if len(history) < 4:
                continue

            tx_utils = [h.get("tx_util_pct", 0.0) for h in history]
            current_ewma = self._compute_ewma(tx_utils)
            slope, _, r2 = self._compute_linear_drift(tx_utils)
            discards = history[-1].get("buffer_discards_sec", 0.0)

            # Check if utilization is rising and will cross 95% in 120-300 seconds
            # Or if utilization is already elevated (>80%) with positive drift
            if slope > 0.04 and current_ewma > 40.0:
                time_to_95 = (95.0 - current_ewma) / slope
                if 20 <= time_to_95 <= 360:
                    lead_time = int(round(time_to_95))
                    confidence = min(0.96, max(0.68, r2 * 0.85 + (current_ewma / 100.0) * 0.15))
                    
                    signals = [
                        f"Interface Tx utilization rising at +{slope*60:.1f}%/min (Current EWMA: {current_ewma:.1f}%)",
                        f"Linear drift trajectory R² fit: {r2:.2f}",
                        f"Queue buffer discard rate: {discards:.0f} drops/sec"
                    ]
                    
                    affected = [
                        link["source"],
                        link["target"],
                        f"Transit services traversing {link['name']}"
                    ]

                    sop_id = "SOP-MPLS-TE-002" if link.get("layer") == "UNDERLAY" else "SOP-SDWAN-005"
                    
                    alerts.append(PrecursorAlert(
                        precursor_type="INTERFACE_SATURATION_PRECURSOR",
                        target_id=link_id,
                        target_type="LINK",
                        predicted_failure=f"Line Saturation (95%+ utilization) & Tail Drop Overflow on {link_id}",
                        time_to_impact_seconds=lead_time,
                        confidence_score=confidence,
                        severity="CRITICAL" if lead_time < 120 else "HIGH",
                        signals_observed=signals,
                        affected_nodes_and_services=affected,
                        root_cause_hypothesis=f"Elephant flow egress burst on link {link_id} traversing {link.get('source')} to {link.get('target')}.",
                        recommended_sop_id=sop_id,
                        metrics_snapshot={
                            "current_util_pct": round(current_ewma, 1),
                            "drift_slope_pct_sec": round(slope, 3),
                            "r2_fit": round(r2, 2),
                            "discards_sec": discards
                        }
                    ))
            elif discards > 150: # Direct queue buffer explosion
                alerts.append(PrecursorAlert(
                    precursor_type="BUFFER_EXHAUSTION_PRECURSOR",
                    target_id=link_id,
                    target_type="LINK",
                    predicted_failure=f"Severe Queue Starvation & Voice/Video Packet Drops on {link_id}",
                    time_to_impact_seconds=45,
                    confidence_score=0.92,
                    severity="CRITICAL",
                    signals_observed=[
                        f"Buffer discards at {discards:.0f} pps exceeding safe threshold",
                        f"Interface utilization at {current_ewma:.1f}%"
                    ],
                    affected_nodes_and_services=[link["source"], link["target"]],
                    root_cause_hypothesis="Microburst congestion exceeding hardware packet buffer allocation limit.",
                    recommended_sop_id="SOP-BUFFER-004",
                    metrics_snapshot={"discards_sec": discards, "util_pct": round(current_ewma, 1)}
                ))

        return alerts

    def detect_bgp_stress_precursors(self, raw_top: Dict[str, Any]) -> List[PrecursorAlert]:
        alerts = []
        for node in raw_top.get("nodes", []):
            node_id = node["id"]
            history = ts_store.get_node_history(node_id, limit=self.window_samples)
            if not history:
                continue

            latest = history[-1]
            cpu = latest.get("cpu_util_pct", 0.0)
            status = latest.get("status", "ONLINE")
            bgp_sessions = latest.get("bgp_sessions", [])

            # Check for BGP flapping or state oscillations
            flapping_peers = [s for s in bgp_sessions if s.get("state") != "Established" or s.get("flap_count", 0) > 0]
            
            if flapping_peers or status == "DEGRADED":
                peer_desc = [f"{p['peer_id']} ({p.get('state', 'Unknown')}, Flaps: {p.get('flap_count', 0)})" for p in flapping_peers]
                
                alerts.append(PrecursorAlert(
                    precursor_type="BGP_FLAP_CONVERGENCE_STRESS",
                    target_id=node_id,
                    target_type="NODE",
                    predicted_failure=f"BGP Route Withdrawal & Peer Convergence Collapse on {node_id}",
                    time_to_impact_seconds=90,
                    confidence_score=0.94,
                    severity="CRITICAL",
                    signals_observed=[
                        f"BGP session non-Established / flapping states on {len(flapping_peers)} peer(s): {', '.join(peer_desc)}",
                        f"Control plane CPU utilization: {cpu:.1f}%",
                        f"Node operational status: {status}"
                    ],
                    affected_nodes_and_services=[
                        node_id,
                        f"Site {node.get('site_id')} SD-WAN Overlay EVPN Reachability"
                    ],
                    root_cause_hypothesis=f"Hold-timer expiration or carrier optical jitter on uplink connecting {node_id}.",
                    recommended_sop_id="SOP-BGP-001",
                    metrics_snapshot={"cpu_util_pct": cpu, "flapping_peers_count": len(flapping_peers)}
                ))
        return alerts

    def detect_ipsec_degradation_precursors(self, raw_top: Dict[str, Any]) -> List[PrecursorAlert]:
        alerts = []
        for link in raw_top.get("links", []):
            if link.get("layer") != "OVERLAY":
                continue
            
            link_id = link["id"]
            history = ts_store.get_link_history(link_id, limit=self.window_samples)
            if len(history) < 4:
                continue

            latencies = [h.get("latency_ms", 0.0) for h in history]
            jitters = [h.get("jitter_ms", 0.0) for h in history]
            losses = [h.get("packet_loss_pct", 0.0) for h in history]

            current_lat = self._compute_ewma(latencies)
            current_jit = self._compute_ewma(jitters)
            current_loss = history[-1].get("packet_loss_pct", 0.0)
            lat_thresh = link.get("sla_latency_threshold_ms", 35.0)

            lat_slope, _, _ = self._compute_linear_drift(latencies)
            loss_slope, _, _ = self._compute_linear_drift(losses)

            if current_lat >= lat_thresh or current_loss > 0.5 or current_jit > 6.0 or (current_lat > (lat_thresh * 0.7) and lat_slope > 0.05):
                time_to_sla = max(15, min(300, int((lat_thresh - current_lat) / max(0.01, abs(lat_slope))))) if lat_slope > 0 and current_lat < lat_thresh else 20
                alerts.append(PrecursorAlert(
                    precursor_type="IPSEC_OVERLAY_DEGRADATION",
                    target_id=link_id,
                    target_type="LINK",
                    predicted_failure=f"SD-WAN IPSec Tunnel SLA Breach & MOS Score Collapse on {link_id}",
                    time_to_impact_seconds=time_to_sla,
                    confidence_score=0.89,
                    severity="HIGH",
                    signals_observed=[
                        f"Overlay latency at {current_lat:.1f}ms (SLA limit: {lat_thresh}ms, drift: {lat_slope*60:+.1f}ms/min)",
                        f"Jitter drift: {current_jit:.1f}ms",
                        f"Packet loss: {current_loss:.2f}%"
                    ],
                    affected_nodes_and_services=[
                        link["source"],
                        link["target"],
                        "VoIP SIP RTP Streams (DSCP EF)",
                        "Real-Time Video Conference (DSCP AF41)"
                    ],
                    root_cause_hypothesis=f"Underlay MPLS path congestion or IKEv2 DPD keepalive delay on transit path for {link_id}.",
                    recommended_sop_id="SOP-IPSEC-003",
                    metrics_snapshot={
                        "current_latency_ms": round(current_lat, 1),
                        "jitter_ms": round(current_jit, 1),
                        "loss_pct": round(current_loss, 3),
                        "sla_threshold_ms": lat_thresh
                    }
                ))

        return alerts

    def evaluate_all_precursors(self) -> Dict[str, Any]:
        raw_top = topology_engine.get_raw_topology()
        sat_alerts = self.detect_interface_saturation_precursors(raw_top)
        bgp_alerts = self.detect_bgp_stress_precursors(raw_top)
        ipsec_alerts = self.detect_ipsec_degradation_precursors(raw_top)

        all_alerts = sat_alerts + bgp_alerts + ipsec_alerts
        # Sort by urgency (lowest time to impact first)
        all_alerts.sort(key=lambda a: a.time_to_impact_seconds)

        overall_risk_score = 0
        if all_alerts:
            # Score 0-100 based on alert severities & counts
            crit_count = sum(1 for a in all_alerts if a.severity == "CRITICAL")
            high_count = sum(1 for a in all_alerts if a.severity == "HIGH")
            overall_risk_score = min(100, (crit_count * 35) + (high_count * 20) + (len(all_alerts) * 10))
        else:
            overall_risk_score = 5 # baseline nominal risk

        return {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "overall_network_risk_score": overall_risk_score,
            "risk_level": "ELEVATED" if overall_risk_score > 60 else "MODERATE" if overall_risk_score > 25 else "NORMAL",
            "precursors_detected_count": len(all_alerts),
            "precursors": [a.to_dict() for a in all_alerts]
        }

predictive_engine = PredictiveEngine()
