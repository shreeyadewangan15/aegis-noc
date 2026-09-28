// Local Air-Gapped API Client (Zero Outbound Egress)

import type {
  NetworkTopology,
  TelemetryLiveSnapshot,
  HealthStatus,
  Runbook,
  PrecursorsPayload,
  StructuredCopilotResponse
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export const api = {
  async getTopology(): Promise<NetworkTopology> {
    const res = await fetch(`${API_BASE}/topology`);
    if (!res.ok) throw new Error(`Failed to fetch topology: ${res.statusText}`);
    return res.json();
  },

  async getLiveTelemetry(): Promise<TelemetryLiveSnapshot> {
    const res = await fetch(`${API_BASE}/telemetry/live`);
    if (!res.ok) throw new Error(`Failed to fetch live telemetry: ${res.statusText}`);
    return res.json();
  },

  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Failed to fetch health status: ${res.statusText}`);
    return res.json();
  },

  async getLinkHistory(linkId: string, limit = 60) {
    const res = await fetch(`${API_BASE}/telemetry/history/link/${linkId}?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch link history: ${res.statusText}`);
    return res.json();
  },

  async getNodeHistory(nodeId: string, limit = 60) {
    const res = await fetch(`${API_BASE}/telemetry/history/node/${nodeId}?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch node history: ${res.statusText}`);
    return res.json();
  },

  async getSystemHistory(limit = 60) {
    const res = await fetch(`${API_BASE}/telemetry/history/system?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to fetch system history: ${res.statusText}`);
    return res.json();
  },

  async calculatePath(source: string, target: string, layer = 'UNDERLAY') {
    const res = await fetch(`${API_BASE}/topology/path?source=${source}&target=${target}&layer=${layer}`);
    if (!res.ok) throw new Error(`Path calculation failed: ${res.statusText}`);
    return res.json();
  },

  async calculateBlastRadius(targetId: string) {
    const res = await fetch(`${API_BASE}/topology/blast-radius?target_id=${targetId}`);
    if (!res.ok) throw new Error(`Blast radius calculation failed: ${res.statusText}`);
    return res.json();
  },

  async injectAnomaly(scenario: string, targetId: string, duration = 60, severity = 'HIGH') {
    const res = await fetch(`${API_BASE}/predictive/inject-anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        target_id: targetId,
        duration_seconds: duration,
        severity
      })
    });
    if (!res.ok) throw new Error(`Anomaly injection failed: ${res.statusText}`);
    return res.json();
  },

  async clearAnomalies() {
    const res = await fetch(`${API_BASE}/predictive/clear-anomalies`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`Clear anomalies failed: ${res.statusText}`);
    return res.json();
  },

  async getRunbooks(): Promise<{ count: number; runbooks: Runbook[] }> {
    const res = await fetch(`${API_BASE}/predictive/runbooks`);
    if (!res.ok) throw new Error(`Failed to fetch runbooks: ${res.statusText}`);
    return res.json();
  },

  async searchRCA(query: string): Promise<{ query: string; matched_runbooks: Runbook[] }> {
    const res = await fetch(`${API_BASE}/predictive/rca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error(`RCA search failed: ${res.statusText}`);
    return res.json();
  },

  async getPrecursors(): Promise<PrecursorsPayload> {
    const res = await fetch(`${API_BASE}/copilot/precursors`);
    if (!res.ok) throw new Error(`Failed to fetch precursors: ${res.statusText}`);
    return res.json();
  },

  async analyzeCopilot(): Promise<StructuredCopilotResponse> {
    const res = await fetch(`${API_BASE}/copilot/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Copilot analysis failed: ${res.statusText}`);
    return res.json();
  },

  async chatCopilot(query: string): Promise<{
    query: string;
    structured_analysis: StructuredCopilotResponse;
    natural_language_response: string;
    matched_sops: any[];
  }> {
    const res = await fetch(`${API_BASE}/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error(`Copilot chat failed: ${res.statusText}`);
    return res.json();
  },

  createTelemetryEventSource(onMessage: (data: TelemetryLiveSnapshot) => void, onError?: (err: any) => void) {
    const es = new EventSource(`${API_BASE}/telemetry/stream`);
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch (e) {
        console.error('SSE JSON parse error:', e);
      }
    };
    if (onError) {
      es.onerror = onError;
    }
    return es;
  }
};
