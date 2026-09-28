"""
Predictive Precursor & AI Copilot API Endpoints
Answers the 3 Primary NOC Questions:
- Q1: What is likely to fail next — and when?
- Q2: Why is risk assessed as elevated — which signals contributed?
- Q3: What corrective action should be taken before SLA or security impact occurs?
"""

from fastapi import APIRouter, Body, Query, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.services.predictive_engine import predictive_engine
from app.services.copilot_service import copilot_service
from app.services.chroma_rag_service import chroma_rag

router = APIRouter(prefix="/copilot", tags=["AI Predictive Copilot"])

class CopilotChatRequest(BaseModel):
    query: str

class StructuredCopilotResponse(BaseModel):
    predicted_issue: str
    time_to_impact: str
    time_to_impact_seconds: Optional[int] = 120
    confidence: float
    signals_observed: List[str]
    affected_nodes_and_services: List[str]
    root_cause_hypothesis: str
    recommended_actions: List[str]
    automation_runbook_id: str
    overall_risk_score: Optional[int] = 5
    inference_engine: Optional[str] = "Local Deterministic"

@router.get("/precursors")
async def get_active_precursors():
    """Returns all active detected precursors with time-to-impact and confidence scores."""
    return predictive_engine.evaluate_all_precursors()

@router.post("/analyze", response_model=StructuredCopilotResponse)
async def analyze_precursor_telemetry():
    """
    Evaluates real-time network state and synthesizes structured answers to Q1, Q2, Q3.
    """
    return copilot_service.analyze_network_state()

@router.post("/chat")
async def chat_with_copilot(payload: CopilotChatRequest):
    """
    Conversational offline copilot answering ad-hoc operator queries grounded in live telemetry & ChromaDB.
    """
    return copilot_service.chat_query(payload.query)

@router.get("/sops")
async def get_all_sops():
    """Returns all enterprise SOPs indexed in the local ChromaDB vector store."""
    return {"count": len(chroma_rag.get_all_sops()), "sops": chroma_rag.get_all_sops()}
