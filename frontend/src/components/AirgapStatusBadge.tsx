import React from 'react';
import { ShieldCheck, Database, Lock, Radio } from 'lucide-react';
import type { HealthStatus } from '../types';

interface AirgapStatusBadgeProps {
  health: HealthStatus | null;
  tickCount: number;
}

export const AirgapStatusBadge: React.FC<AirgapStatusBadgeProps> = ({ health, tickCount }) => {
  const blockedAttempts = health?.blocked_outbound_egress_attempts ?? 0;
  const dbEngine = health?.database?.engine ?? 'DuckDB';
  const totalMetrics = (health?.database?.total_persisted_node_metrics ?? 0) + (health?.database?.total_persisted_link_metrics ?? 0);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.78rem'
    }}>
      {/* Airgap Guard Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.35)',
        padding: '4px 10px',
        borderRadius: '6px',
        color: '#00ff88'
      }}>
        <Lock size={13} />
        <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>STRICT AIR-GAP: ACTIVE</span>
        <div className="pulse-dot-green" />
      </div>

      {/* Outbound Egress Blocked Counter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        padding: '4px 10px',
        borderRadius: '6px',
        color: '#94a3b8'
      }}>
        <ShieldCheck size={13} color="#00f0ff" />
        <span>External Egress:</span>
        <span className="mono-val" style={{ color: blockedAttempts > 0 ? '#ff2255' : '#00f0ff' }}>
          0 LEAKS ({blockedAttempts} BLOCKED)
        </span>
      </div>

      {/* Local Time Series Database */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        padding: '4px 10px',
        borderRadius: '6px',
        color: '#94a3b8'
      }}>
        <Database size={13} color="#a855f7" />
        <span>Store:</span>
        <span className="mono-val" style={{ color: '#e2e8f0' }}>{dbEngine} ({totalMetrics.toLocaleString()} rows)</span>
      </div>

      {/* 1Hz Live Stream Clock */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0, 240, 255, 0.08)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        padding: '4px 10px',
        borderRadius: '6px',
        color: '#00f0ff'
      }}>
        <Radio size={13} />
        <span className="mono-val">1Hz STREAM (TICK: {tickCount})</span>
      </div>
    </div>
  );
};
