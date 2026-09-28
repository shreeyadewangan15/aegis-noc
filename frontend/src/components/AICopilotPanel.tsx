import React, { useState, useEffect } from 'react';
import type { StructuredCopilotResponse } from '../types';
import { api } from '../services/api';
import {
  Bot,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface AICopilotPanelProps {
  onOpenChat: () => void;
  onOpenRunbook: (sopId: string) => void;
  telemetryTick: number;
}

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  onOpenChat,
  onOpenRunbook,
  telemetryTick
}) => {
  const [analysis, setAnalysis] = useState<StructuredCopilotResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [remediated, setRemediated] = useState<boolean>(false);

  useEffect(() => {
    // Refresh analysis periodically on tick changes
    if (telemetryTick % 3 === 0) {
      loadAnalysis();
    }
  }, [telemetryTick]);

  const loadAnalysis = async () => {
    try {
      const data = await api.analyzeCopilot();
      setAnalysis(data);
    } catch (e) {
      console.error('Failed to load copilot analysis:', e);
    }
  };

  const handleExecuteRemediation = async () => {
    setLoading(true);
    try {
      // Clear anomalies and restore network baseline
      await api.clearAnomalies();
      setRemediated(true);
      setTimeout(() => {
        setRemediated(false);
        loadAnalysis();
      }, 3000);
    } catch (e) {
      console.error('Remediation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const hasImminentFailure = (analysis?.time_to_impact_seconds ?? 600) < 360 && analysis?.automation_runbook_id !== 'SOP-NOMINAL-MONITOR';
  const confidencePct = Math.round((analysis?.confidence ?? 0.98) * 100);

  return (
    <div
      className={`noc-panel ${hasImminentFailure ? 'noc-panel-glow-red' : 'noc-panel-glow-green'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px',
        position: 'relative',
        background: hasImminentFailure
          ? 'linear-gradient(135deg, rgba(30, 15, 25, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(10, 25, 20, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: hasImminentFailure ? 'rgba(255, 34, 85, 0.2)' : 'rgba(0, 240, 255, 0.15)',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={18} color={hasImminentFailure ? '#ff2255' : '#00f0ff'} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>OFFLINE PREDICTIVE LLM COPILOT</span>
              <span style={{
                fontSize: '0.65rem',
                color: hasImminentFailure ? '#ff2255' : '#00ff88',
                background: hasImminentFailure ? 'rgba(255, 34, 85, 0.15)' : 'rgba(0, 255, 136, 0.12)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700
              }}>
                {hasImminentFailure ? '⚡ ELEVATED RISK DETECTED' : '✓ EQUILIBRIUM'}
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              Air-Gapped Local Inference ({analysis?.inference_engine || 'Ollama llama3.2'}) • Grounded in ChromaDB Vector SOPs
            </div>
          </div>
        </div>

        {/* Ask Copilot Interactive CTA */}
        <button
          className="tactical-btn"
          style={{
            background: 'rgba(0, 240, 255, 0.12)',
            borderColor: 'rgba(0, 240, 255, 0.4)',
            color: '#00f0ff',
            padding: '5px 12px'
          }}
          onClick={onOpenChat}
        >
          <MessageSquare size={13} />
          <span>Interactive Chat</span>
        </button>
      </div>

      {/* 3 Core NOC Question Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {/* Q1: What is likely to fail next — and when? */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '6px',
          padding: '10px 12px',
          border: hasImminentFailure ? '1px solid rgba(255, 34, 85, 0.35)' : '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: '#00f0ff', fontWeight: 700, letterSpacing: '0.04em' }}>
                Q1: PREDICTED FAILURE & LEAD TIME
              </span>
              <Clock size={14} color={hasImminentFailure ? '#ff2255' : '#00ff88'} />
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: hasImminentFailure ? '#ff2255' : '#e2e8f0', marginBottom: '6px', lineHeight: '1.25' }}>
              {analysis?.predicted_issue || 'Scanning real-time telemetry buffer...'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Lead Time:</span>
              <span className="mono-val" style={{ fontSize: '0.85rem', color: hasImminentFailure ? '#ffb700' : '#00ff88' }}>
                {analysis?.time_to_impact || '600s'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Confidence:</span>
              <span className="mono-val" style={{ fontSize: '0.82rem', color: '#00f0ff' }}>
                {confidencePct}%
              </span>
            </div>
          </div>
        </div>

        {/* Q2: Why is risk assessed as elevated — which signals contributed? */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '6px',
          padding: '10px 12px',
          border: hasImminentFailure ? '1px solid rgba(255, 183, 0, 0.35)' : '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: '#ffb700', fontWeight: 700, letterSpacing: '0.04em' }}>
                Q2: CONTRIBUTING SIGNALS & ROOT CAUSE
              </span>
              <Zap size={14} color="#ffb700" />
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Hypothesis:</span> {analysis?.root_cause_hypothesis}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '55px', overflowY: 'auto' }}>
            {analysis?.signals_observed.slice(0, 2).map((sig, idx) => (
              <div key={idx} style={{ fontSize: '0.68rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#00f0ff' }}>•</span>
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{sig}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Q3: What corrective action should be taken before SLA or security impact occurs? */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '6px',
          padding: '10px 12px',
          border: '1px solid rgba(0, 255, 136, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: '#00ff88', fontWeight: 700, letterSpacing: '0.04em' }}>
                Q3: CORRECTIVE REMEDIATION
              </span>
              <ShieldCheck size={14} color="#00ff88" />
            </div>

            <div style={{ fontSize: '0.73rem', color: '#e2e8f0', marginBottom: '6px' }}>
              {analysis?.recommended_actions[0] || 'Nominal monitoring.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <button
              className="tactical-btn"
              style={{
                flex: 1,
                fontSize: '0.7rem',
                padding: '4px 8px',
                background: remediated ? 'rgba(0,255,136,0.3)' : 'rgba(0,255,136,0.15)',
                borderColor: '#00ff88',
                color: '#00ff88'
              }}
              onClick={handleExecuteRemediation}
              disabled={loading || !hasImminentFailure}
            >
              {remediated ? (
                <>
                  <CheckCircle2 size={12} /> Auto-Remediated!
                </>
              ) : (
                <>
                  <Sparkles size={12} /> Execute Runbook
                </>
              )}
            </button>

            {analysis?.automation_runbook_id && (
              <button
                className="tactical-btn"
                style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                onClick={() => onOpenRunbook(analysis.automation_runbook_id)}
              >
                <span>View {analysis.automation_runbook_id}</span>
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
