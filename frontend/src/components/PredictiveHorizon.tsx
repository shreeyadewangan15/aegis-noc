import React, { useState, useEffect } from 'react';
import type { StructuredCopilotResponse } from '../types';
import { api } from '../services/api';
import {
  Clock,
  Play,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface PredictiveHorizonProps {
  telemetryTick: number;
  onOpenRunbook: (sopId: string) => void;
  onOpenTerminal: () => void;
}

export const PredictiveHorizon: React.FC<PredictiveHorizonProps> = ({
  telemetryTick,
  onOpenRunbook,
  onOpenTerminal
}) => {
  const [analysis, setAnalysis] = useState<StructuredCopilotResponse | null>(null);
  const [remediated, setRemediated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (telemetryTick % 2 === 0) {
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

  const leadTimeSeconds = analysis?.time_to_impact_seconds ?? 600;
  const isAtRisk = leadTimeSeconds < 360 && analysis?.automation_runbook_id !== 'SOP-NOMINAL-MONITOR';
  const confidencePct = Math.round((analysis?.confidence ?? 0.98) * 100);

  // Format countdown string MM:SS
  const formatCountdown = (secs: number) => {
    if (secs >= 600) return '> 10:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Signal breakdown weights
  const signalWeights = [
    { name: 'Buffer Bloat Queue', value: isAtRisk ? 42 : 5, color: '#ff2255' },
    { name: 'Keepalive Jitter Drift', value: isAtRisk ? 35 : 4, color: '#ffb700' },
    { name: 'Linear Util Drift', value: isAtRisk ? 28 : 6, color: '#00f0ff' },
    { name: 'BGP Prefix Churn', value: isAtRisk ? 18 : 2, color: '#a855f7' }
  ];

  return (
    <div
      className={`noc-panel ${isAtRisk ? 'noc-panel-glow-red' : 'noc-panel-glow-green'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '14px 16px',
        background: isAtRisk
          ? 'linear-gradient(135deg, rgba(32, 14, 24, 0.95) 0%, rgba(12, 18, 30, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(10, 26, 22, 0.95) 0%, rgba(12, 18, 30, 0.95) 100%)'
      }}
    >
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={isAtRisk ? 'pulse-dot-red' : 'pulse-dot-green'} />
          <span style={{ fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.04em' }}>
            PREDICTIVE HORIZON (EARLY WARNING COPILOT)
          </span>
          <span style={{
            fontSize: '0.66rem',
            color: isAtRisk ? '#ff2255' : '#00ff88',
            background: isAtRisk ? 'rgba(255, 34, 85, 0.15)' : 'rgba(0, 255, 136, 0.12)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            {isAtRisk ? 'CRITICAL PRECURSOR ACTIVE' : 'NOMINAL STABILITY'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="tactical-btn"
            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
            onClick={onOpenTerminal}
          >
            <span>Copilot Terminal</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Grid of Q1/Q2/Q3 + Signal Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr', gap: '12px' }}>
        {/* Q1: Predicted Failure & Lead Time Countdown */}
        <div style={{
          background: 'rgba(0,0,0,0.35)',
          padding: '12px',
          borderRadius: '6px',
          border: isAtRisk ? '1px solid rgba(255,34,85,0.4)' : '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#00f0ff', fontWeight: 700, marginBottom: '6px' }}>
              Q1: WHAT IS LIKELY TO FAIL NEXT & WHEN?
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isAtRisk ? '#ff2255' : '#e2e8f0', lineHeight: '1.3' }}>
              {analysis?.predicted_issue || 'Scanning telemetry sliding windows...'}
            </div>
          </div>

          {/* Large Countdown Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '10px',
            padding: '8px 10px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '4px',
            border: '1px solid rgba(56,189,248,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color={isAtRisk ? '#ff2255' : '#00ff88'} />
              <div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>LEAD TIME TO IMPACT</div>
                <div className="mono-val" style={{ fontSize: '1.25rem', color: isAtRisk ? '#ff2255' : '#00ff88', fontWeight: 800 }}>
                  {formatCountdown(leadTimeSeconds)}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>CONFIDENCE</div>
              <div className="mono-val" style={{ fontSize: '1.1rem', color: '#00f0ff', fontWeight: 700 }}>
                {confidencePct}%
              </div>
            </div>
          </div>
        </div>

        {/* Q2: Signals Observed & Signal Contribution Bar Chart */}
        <div style={{
          background: 'rgba(0,0,0,0.35)',
          padding: '12px',
          borderRadius: '6px',
          border: isAtRisk ? '1px solid rgba(255,183,0,0.4)' : '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#ffb700', fontWeight: 700, marginBottom: '4px' }}>
              Q2: WHY IS RISK ELEVATED — CONTRIBUTING SIGNALS
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Hypothesis:</span> {analysis?.root_cause_hypothesis}
            </div>
          </div>

          {/* Contribution Signal Bar Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {signalWeights.map((sig, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem' }}>
                  <span style={{ color: '#cbd5e1' }}>{sig.name}</span>
                  <span className="mono-val" style={{ color: sig.color, fontWeight: 700 }}>+{sig.value}%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${sig.value}%`,
                      height: '100%',
                      background: sig.color,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q3: Corrective Actions & Runbook Execution */}
        <div style={{
          background: 'rgba(0,0,0,0.35)',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid rgba(0,255,136,0.35)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#00ff88', fontWeight: 700, marginBottom: '4px' }}>
              Q3: CORRECTIVE PREVENTIVE ACTION
            </div>
            <div style={{ fontSize: '0.72rem', color: '#e2e8f0', lineHeight: '1.3' }}>
              {analysis?.recommended_actions[0] || 'Nominal 1Hz drift monitoring.'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
            <button
              className="tactical-btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                background: remediated ? 'rgba(0,255,136,0.35)' : 'rgba(0,255,136,0.15)',
                borderColor: '#00ff88',
                color: '#00ff88',
                fontWeight: 700
              }}
              onClick={handleExecuteRemediation}
              disabled={loading || !isAtRisk}
            >
              {remediated ? (
                <>
                  <CheckCircle2 size={13} /> Runbook Executed!
                </>
              ) : (
                <>
                  <Play size={13} /> Execute Preventive Runbook
                </>
              )}
            </button>

            {analysis?.automation_runbook_id && (
              <button
                className="tactical-btn"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.68rem', padding: '3px 8px' }}
                onClick={() => onOpenRunbook(analysis.automation_runbook_id)}
              >
                <span>View {analysis.automation_runbook_id} (SOP)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
