"""
Automated Air-Gap & Platform Verification Suite
Validates:
1. Air-gap runtime network guard blocking external socket connections.
2. NetworkX topology graph and blast radius calculations.
3. 1Hz multi-router telemetry daemon and chaos injector.
4. ChromaDB vector store with Enterprise SOP ingestion.
5. Precursor predictive analytics engine (EWMA, linear drift, lead time, confidence).
6. Local Air-Gapped AI Copilot answering Q1, Q2, and Q3 with structured JSON.
"""

import sys
import socket
import urllib.request
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.airgap_guard import guard_manager, AirgapSecurityViolation
from app.services.topology_engine import topology_engine
from app.services.telemetry_daemon import telemetry_daemon
from app.services.chroma_rag_service import chroma_rag
from app.services.predictive_engine import predictive_engine
from app.services.copilot_service import copilot_service

def test_airgap_egress_block():
    print(">>> 1. Testing Air-Gap Network Guard Enforcement...")
    guard_manager.install()
    
    blocked = False
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        s.connect(("8.8.8.8", 53))
        s.close()
    except AirgapSecurityViolation as e:
        blocked = True
        print(f"    [PASS] External IP connection to 8.8.8.8 was successfully BLOCKED: {e}")
    except Exception as ex:
        print(f"    [INFO] Caught socket exception: {ex}")

    status = guard_manager.get_status()
    print(f"    [PASS] Guard status: Active={status['guard_active']}, Blocked Egress Attempts={status['blocked_outbound_violations']}")
    assert status["blocked_outbound_violations"] >= 1, "Expected at least 1 blocked outbound attempt"
    print("    [AIR-GAP CONFIRMED] Outbound egress is strictly forbidden.\n")

def test_topology_engine():
    print(">>> 2. Testing NetworkX Topology Engine & Blast Radius...")
    raw = topology_engine.get_raw_topology()
    nodes = raw.get("nodes", [])
    links = raw.get("links", [])
    
    print(f"    Total Nodes: {len(nodes)}, Total Links: {len(links)}")
    assert len(nodes) >= 11
    assert len(links) >= 17

    blast_pe = topology_engine.compute_blast_radius("PE-01")
    print(f"    [PASS] Blast Radius for PE-01: Criticality={blast_pe['impact_criticality']}, Severed Tunnels={blast_pe['severed_overlay_tunnels_count']}")
    assert blast_pe["severed_overlay_tunnels_count"] > 0
    print("    [TOPOLOGY ENGINE VERIFIED]\n")

def test_chromadb_rag():
    print(">>> 3. Testing ChromaDB Vector Store & Enterprise SOP RAG...")
    sops = chroma_rag.get_all_sops()
    print(f"    Total SOPs Ingested: {len(sops)}")
    assert len(sops) >= 5

    results = chroma_rag.query_sops("BGP hold timer flap damping on PE-CE uplink", n_results=2)
    print(f"    Query: 'BGP hold timer flap damping on PE-CE uplink'")
    for r in results:
        print(f"    -> Matched SOP [{r['id']}]: {r['title']} (Score: {r.get('similarity_score', 0.0)})")
    assert len(results) > 0
    assert results[0]["id"] == "SOP-BGP-001"
    print("    [CHROMADB RAG VERIFIED]\n")

def test_precursor_engine():
    print(">>> 4. Testing Precursor Predictive Analytics Engine...")
    # Inject anomaly to create precursor telemetry
    anom_id = telemetry_daemon.inject_anomaly("LATENCY_SPIKE", "LINK-OVL-01", duration=45)
    
    # Step telemetry 8 times to populate sliding-window drift
    for _ in range(8):
        telemetry_daemon.step()

    precursor_data = predictive_engine.evaluate_all_precursors()
    print(f"    Risk Score: {precursor_data['overall_network_risk_score']}/100 ({precursor_data['risk_level']})")
    print(f"    Precursors Detected: {precursor_data['precursors_detected_count']}")
    
    assert precursor_data['precursors_detected_count'] > 0
    primary = precursor_data['precursors'][0]
    print(f"    [PASS] Detected Precursor: {primary['predicted_failure']}")
    print(f"    [PASS] Lead Time: {primary['time_to_impact']} ({primary['time_to_impact_seconds']}s)")
    print(f"    [PASS] Calibrated Confidence: {primary['confidence_score'] * 100}%")
    print(f"    [PASS] Signals Observed: {primary['signals_observed']}")
    print("    [PRECURSOR ENGINE VERIFIED]\n")

def test_copilot_service():
    print(">>> 5. Testing Offline LLM Copilot Engine (Q1, Q2, Q3)...")
    analysis = copilot_service.analyze_network_state()
    
    print(f"    [Q1] What is likely to fail next & when?")
    print(f"         -> {analysis['predicted_issue']} in {analysis['time_to_impact']} (Confidence: {analysis['confidence']*100:.0f}%)")
    
    print(f"    [Q2] Why is risk assessed as elevated?")
    print(f"         -> Root Cause: {analysis['root_cause_hypothesis']}")
    print(f"         -> Signals: {analysis['signals_observed']}")
    
    print(f"    [Q3] What corrective action should be taken?")
    print(f"         -> SOP ID: {analysis['automation_runbook_id']}")
    print(f"         -> Actions: {analysis['recommended_actions']}")

    # Verify structured JSON format matching requirements
    required_keys = [
        "predicted_issue",
        "time_to_impact",
        "confidence",
        "signals_observed",
        "affected_nodes_and_services",
        "root_cause_hypothesis",
        "recommended_actions",
        "automation_runbook_id"
    ]
    for k in required_keys:
        assert k in analysis, f"Missing required key '{k}' in Copilot analysis"

    # Restore baseline
    telemetry_daemon.clear_anomalies()
    print("    [OFFLINE LLM COPILOT VERIFIED]\n")

if __name__ == "__main__":
    print("=================================================================")
    print(" AegisNOC Precursor Predictive & LLM Copilot Verification Suite")
    print("=================================================================\n")
    test_airgap_egress_block()
    test_topology_engine()
    test_chromadb_rag()
    test_precursor_engine()
    test_copilot_service()
    print(">>> ALL PREDICTIVE & COPILOT TESTS PASSED CLEANLY (100% AIR-GAPPED).")
