import React, { useState, useEffect } from 'react';
import type { PrecursorsPayload } from '../types';
import { api } from '../services/api';
import { Radio, TrendingUp, GitPullRequest, Zap, Clock } from 'lucide-react';

interface PrecursorRadarProps {
  telemetryTick: number;
  onSelectEntity?: (targetId: string, targetType: 'LINK' | 'NODE') => void;
  onOpenSOP: (sopId: string) => void;
}

export const PrecursorRadar: React.FC<PrecursorRadarProps> = ({
  telemetryTick,
  onOpenSOP
}) => {
  const [data, setData] = useState<PrecursorsPayload | null>(null);

  useEffect(() => {
    if (telemetryTick % 2 === 0) {
      loadPrecursors();
    }
  }, [telemetryTick]);

  const loadPrecursors = async () => {
    try {
      const res = await api.getPrecursors();
      setData(res);
    } catch (e) {
      console.error('Failed to load precursors:', e);
    }
  };

  const precursors = data?.precursors || [];

  return (
    <div className="noc-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Radio size={15} color="#00f0ff" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em' }}>
            PRECURSOR RADAR (SLIDING-WINDOW EWMA & LINEAR DRIFT)
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', color: precursors.length > 0 ? '#ff2255' : '#00ff88', fontWeight: 600 }}>
          {precursors.length > 0 ? `⚡ ${precursors.length} EARLY PRECURSORS` : '✓ 0 ACTIVE DRIFTS'}
        </span>
      </div>

      {precursors.length === 0 ? (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(0,255,136,0.05)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(0,255,136,0.15)' }}>
          ✓ Telemetry drift normal. No interface saturation (95%+ in 120–300s) or BGP/IPSec stress detected.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
          {precursors.map((p, idx) => {
            const isSat = p.precursor_type.includes('SATURATION');
            const isBGP = p.precursor_type.includes('BGP');
            const color = isSat ? '#ffb700' : isBGP ? '#ff2255' : '#00f0ff';

            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${color}40`,
                  borderRadius: '4px',
                  padding: '6px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSat ? <TrendingUp size={14} color={color} /> : isBGP ? <GitPullRequest size={14} color={color} /> : <Zap size={14} color={color} />}
                  <div>
                    <div style={{ fontWeight: 700, color: '#e2e8f0' }}>
                      <span className="mono-val" style={{ color, marginRight: '6px' }}>[{p.target_id}]</span>
                      {p.predicted_failure}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                      Signals: {p.signals_observed[0]}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono-val" style={{ color: p.time_to_impact_seconds < 90 ? '#ff2255' : '#ffb700', fontWeight: 700 }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                      {p.time_to_impact}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#00f0ff' }}>
                      Confidence: {(p.confidence_score * 100).toFixed(0)}%
                    </div>
                  </div>

                  <button
                    className="tactical-btn"
                    style={{ fontSize: '0.65rem', padding: '3px 6px' }}
                    onClick={() => onOpenSOP(p.recommended_sop_id)}
                  >
                    SOP
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
