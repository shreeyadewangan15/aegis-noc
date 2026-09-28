"""
Local Air-Gapped LLM Copilot Engine
Synthesizes precursor telemetry, NetworkX topology, and ChromaDB vector SOPs to answer:
- Q1: What is likely to fail next — and when?
- Q2: Why is risk assessed as elevated — which signals contributed?
- Q3: What corrective action should be taken before SLA or security impact occurs?

Supports local Ollama (llama3.2 / mistral) on localhost:11434 with deterministic local fallback.
Strict Air-Gap compliant: 0 remote cloud calls.
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.services.predictive_engine import predictive_engine
from app.services.chroma_rag_service import chroma_rag
from app.services.topology_engine import topology_engine
from app.services.telemetry_daemon import telemetry_daemon

logger = logging.getLogger("NOCCopilotService")
OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"
DEFAULT_MODEL = "llama3.2:latest"

class NOCCopilotService:
    def __init__(self):
        self.ollama_available = False
        self._check_ollama()

    def _check_ollama(self):
        try:
            req = urllib.request.Request("http://127.0.0.1:11434/api/tags", headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=1.5) as response:
                if response.status == 200:
                    self.ollama_available = True
                    logger.info("Local Ollama inference engine detected on localhost:11434.")
                    return
        except Exception:
            self.ollama_available = False
            logger.info("Local Ollama not reachable; running deterministic local rule-based LLM engine.")

    def _call_ollama(self, prompt: str, system_prompt: str) -> Optional[str]:
        if not self.ollama_available:
            return None

        payload = {
            "model": DEFAULT_MODEL,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "num_predict": 600
            }
        }

        try:
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                OLLAMA_API_URL,
                data=data_bytes,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=8.0) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                return res_body.get("response")
        except Exception as e:
            logger.warning(f"Ollama inference error ({e}), falling back to deterministic synthesis.")
            return None

    def analyze_network_state(self) -> Dict[str, Any]:
        """
        Synthesizes the 3 core NOC questions based on live precursors and ChromaDB RAG.
        """
        # 1. Evaluate Precursors
        precursors_data = predictive_engine.evaluate_all_precursors()
        active_precursors = precursors_data.get("precursors", [])
        risk_score = precursors_data.get("overall_network_risk_score", 5)

        # Baseline nominal state
        if not active_precursors:
            return {
                "predicted_issue": "Nominal Enterprise Network State: No imminent failure precursor detected",
                "time_to_impact": "> 600 seconds",
                "time_to_impact_seconds": 600,
                "confidence": 0.98,
                "signals_observed": [
                    "All BGP peerings in stable Established state with 0 recent flaps",
                    "Underlay & IPSec overlay link utilization < 50% across all transit trunks",
                    "Buffer discards at 0 drops/sec",
                    "Jitter and latency drift within nominal SLA boundaries (< 1.5ms variance)"
                ],
                "affected_nodes_and_services": ["All enterprise sites operating under nominal SLA"],
                "root_cause_hypothesis": "Network is operating in healthy equilibrium with zero elevated risk indicators.",
                "recommended_actions": [
                    "Maintain continuous 1Hz telemetry sampling and automated sliding-window drift monitoring.",
                    "No corrective intervention required at this time."
                ],
                "automation_runbook_id": "SOP-NOMINAL-MONITOR",
                "overall_risk_score": risk_score,
                "inference_engine": "Local Deterministic Air-Gapped Engine"
            }

        # 2. Select Most Critical Precursor as Primary Investigation Target
        primary = active_precursors[0]
        target_id = primary["target_id"]
        precursor_type = primary["precursor_type"]
        sop_id = primary.get("recommended_sop_id", "SOP-MPLS-TE-002")

        # 3. Retrieve relevant ChromaDB SOP
        matched_sops = chroma_rag.query_sops(f"{precursor_type} {primary['predicted_failure']} {sop_id}", n_results=1)
        sop = matched_sops[0] if matched_sops else {}

        # 4. Attempt Local Ollama JSON Synthesis
        system_prompt = (
            "You are the AegisNOC Air-Gapped AI Systems Engineer. You must analyze network precursor telemetry "
            "and output strictly valid JSON matching the exact schema:\n"
            "{\n"
            '  "predicted_issue": string,\n'
            '  "time_to_impact": string,\n'
            '  "confidence": float,\n'
            '  "signals_observed": string[],\n'
            '  "affected_nodes_and_services": string[],\n'
            '  "root_cause_hypothesis": string,\n'
            '  "recommended_actions": string[],\n'
            '  "automation_runbook_id": string\n'
            "}"
        )

        user_prompt = (
            f"Precursor Event: {json.dumps(primary)}\n"
            f"Relevant Enterprise SOP: {json.dumps(sop)}\n"
            f"Synthesize the answers to:\n"
            f"Q1: What is likely to fail next — and when?\n"
            f"Q2: Why is risk assessed as elevated — which signals contributed?\n"
            f"Q3: What corrective action should be taken before SLA or security impact occurs?"
        )

        llm_response = self._call_ollama(user_prompt, system_prompt)
        if llm_response:
            try:
                parsed = json.loads(llm_response)
                parsed["time_to_impact_seconds"] = primary.get("time_to_impact_seconds", 120)
                parsed["overall_risk_score"] = risk_score
                parsed["inference_engine"] = f"Local Ollama ({DEFAULT_MODEL})"
                return parsed
            except Exception as e:
                logger.warning(f"Failed to parse LLM JSON ({e}), using deterministic synthesis.")

        # 5. Deterministic High-Precision Fallback Synthesis
        remediation_steps = sop.get("preventive_remediation_steps", [
            "Trigger automated path re-route to secondary redundant transit link.",
            "Apply CoS QoS policy rate-limiting non-critical elephant flows.",
            "Tune protocol timers to prevent premature hold-time expiration."
        ])

        return {
            "predicted_issue": primary["predicted_failure"],
            "time_to_impact": primary["time_to_impact"],
            "time_to_impact_seconds": primary["time_to_impact_seconds"],
            "confidence": primary["confidence_score"],
            "signals_observed": primary["signals_observed"],
            "affected_nodes_and_services": primary["affected_nodes_and_services"],
            "root_cause_hypothesis": primary["root_cause_hypothesis"],
            "recommended_actions": remediation_steps,
            "automation_runbook_id": sop.get("id", primary["recommended_sop_id"]),
            "overall_risk_score": risk_score,
            "inference_engine": "Local Deterministic Air-Gapped Reasoning Engine"
        }

    def chat_query(self, query: str) -> Dict[str, Any]:
        """
        Handles interactive conversational NOC operator queries with RAG grounding.
        """
        analysis = self.analyze_network_state()
        matched_sops = chroma_rag.query_sops(query, n_results=2)

        sop_titles = [f"[{s['id']}] {s['title']}" for s in matched_sops]
        
        # Build natural language response
        nl_text = (
            f"### AegisNOC Copilot Diagnostic Assessment\n\n"
            f"**Q1: What is likely to fail next — and when?**\n"
            f"- **Predicted Failure**: {analysis['predicted_issue']}\n"
            f"- **Estimated Lead Time**: **{analysis['time_to_impact']}** (Confidence: {analysis['confidence']*100:.0f}%)\n\n"
            f"**Q2: Why is risk assessed as elevated — which signals contributed?**\n"
            f"- **Root Cause Hypothesis**: {analysis['root_cause_hypothesis']}\n"
            f"- **Contributing Signals**:\n"
        )
        for sig in analysis["signals_observed"]:
            nl_text += f"  - {sig}\n"

        nl_text += (
            f"\n**Q3: What corrective action should be taken before SLA or security impact occurs?**\n"
            f"- **Recommended SOP**: `{analysis['automation_runbook_id']}`\n"
        )
        for act in analysis["recommended_actions"]:
            nl_text += f"  1. {act}\n"

        nl_text += f"\n*Retrieved Vector RAG Grounding:* {', '.join(sop_titles)}"

        return {
            "query": query,
            "structured_analysis": analysis,
            "natural_language_response": nl_text,
            "matched_sops": matched_sops,
            "air_gapped_mode": True
        }

copilot_service = NOCCopilotService()
