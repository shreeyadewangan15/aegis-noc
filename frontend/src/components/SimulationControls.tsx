import React, { useState } from 'react';
import type { NetworkTopology } from '../types';
import { Flame, RefreshCw, Zap } from 'lucide-react';

interface SimulationControlsProps {
  topology: NetworkTopology | null;
  activeAnomaliesCount: number;
  onInject: (scenario: string, targetId: string, duration: number) => void;
  onClear: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  topology,
  activeAnomaliesCount,
  onInject,
  onClear
}) => {
  const [scenario, setScenario] = useState<string>('LATENCY_SPIKE');
  const [targetId, setTargetId] = useState<string>('LINK-OVL-01');
  const [duration, setDuration] = useState<number>(45);

  const targets = scenario === 'BGP_FLAP' || scenario === 'BUFFER_EXHAUSTION'
    ? topology?.nodes.map(n => ({ id: n.id, label: `${n.id} (${n.role})` })) || []
    : topology?.links.map(l => ({ id: l.id, label: `${l.id} (${l.layer})` })) || [];

  const handleInject = () => {
    onInject(scenario, targetId, duration);
  };

  return (
    <div className="noc-panel" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Flame size={16} color="#ffb700" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.02em' }}>
            PREDICTIVE NOC CHAOS SIMULATION
          </span>
        </div>
        {activeAnomaliesCount > 0 && (
          <span style={{ fontSize: '0.72rem', color: '#ff2255', fontWeight: 600 }}>
            {activeAnomaliesCount} INJECTIONS ACTIVE
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto auto', gap: '8px', alignItems: 'center' }}>
        {/* Scenario Selector */}
        <select
          value={scenario}
          onChange={(e) => {
            setScenario(e.target.value);
            // Default target switch
            if (e.target.value === 'BGP_FLAP' || e.target.value === 'BUFFER_EXHAUSTION') {
              setTargetId('DC1-CE-01');
            } else {
              setTargetId('LINK-OVL-01');
            }
          }}
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem'
          }}
        >
          <option value="LATENCY_SPIKE">⚡ Latency/Jitter Drift</option>
          <option value="FIBER_CUT">✂️ Physical Fiber Cut</option>
          <option value="BUFFER_EXHAUSTION">💥 Buffer Overload / Drops</option>
          <option value="BGP_FLAP">🔄 BGP Route Flap</option>
        </select>

        {/* Target Entity */}
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem'
          }}
        >
          {targets.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        {/* Duration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            min="10"
            max="300"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{
              width: '55px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              padding: '6px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>sec</span>
        </div>

        {/* Inject Trigger Button */}
        <button
          className="tactical-btn tactical-btn-danger"
          onClick={handleInject}
        >
          <Zap size={13} /> Inject Anomaly
        </button>

        {/* Restore Steady State Button */}
        <button
          className="tactical-btn"
          onClick={onClear}
        >
          <RefreshCw size={13} color="#00ff88" /> Restore Normal
        </button>
      </div>
    </div>
  );
};
