import React from 'react';
import type { TelemetryLiveSnapshot } from '../types';
import { Activity, Gauge, Zap, ArrowDownUp, ShieldCheck } from 'lucide-react';

interface TelemetryStreamGridProps {
  telemetry: TelemetryLiveSnapshot | null;
  onInspectAnomaly?: (scenario: string, targetId: string) => void;
}

export const TelemetryStreamGrid: React.FC<TelemetryStreamGridProps> = ({ telemetry }) => {
  if (!telemetry) {
    return (
      <div className="noc-panel" style={{ padding: '16px', color: 'var(--text-muted)' }}>
        Streaming live telemetry...
      </div>
    );
  }

  // Aggregate metrics calculations
  const linkList = Object.values(telemetry.links);
  const avgLatency = linkList.length
    ? (linkList.reduce((acc, l) => acc + (l.status === 'DOWN' ? 0 : l.latency_ms), 0) / linkList.filter(l => l.status !== 'DOWN').length).toFixed(1)
    : '0.0';

  const avgJitter = linkList.length
    ? (linkList.reduce((acc, l) => acc + l.jitter_ms, 0) / linkList.length).toFixed(1)
    : '0.0';

  const totalDiscards = linkList.reduce((acc, l) => acc + l.buffer_discards_sec, 0).toFixed(0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 4 Key Performance Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {/* Latency Gauge */}
        <div className="noc-panel" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AVG SLA LATENCY</span>
            <Activity size={14} color="#00f0ff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="mono-val" style={{ fontSize: '1.4rem', color: Number(avgLatency) > 35 ? '#ff2255' : '#00f0ff' }}>
              {avgLatency}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ms</span>
          </div>
        </div>

        {/* Jitter Gauge */}
        <div className="noc-panel" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>JITTER DRIFT</span>
            <Gauge size={14} color="#a855f7" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="mono-val" style={{ fontSize: '1.4rem', color: Number(avgJitter) > 5 ? '#ffb700' : '#a855f7' }}>
              {avgJitter}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ms</span>
          </div>
        </div>

        {/* Total Buffer Discards */}
        <div className="noc-panel" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>BUFFER DISCARDS</span>
            <Zap size={14} color={Number(totalDiscards) > 100 ? '#ff2255' : '#00ff88'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="mono-val" style={{ fontSize: '1.4rem', color: Number(totalDiscards) > 100 ? '#ff2255' : '#00ff88' }}>
              {totalDiscards}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>/sec</span>
          </div>
        </div>

        {/* SLA Health Ratio */}
        <div className="noc-panel" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SLA COMPLIANCE</span>
            <ShieldCheck size={14} color={telemetry.breached_links > 0 ? '#ff2255' : '#00ff88'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="mono-val" style={{ fontSize: '1.4rem', color: telemetry.breached_links > 0 ? '#ff2255' : '#00ff88' }}>
              {(((telemetry.healthy_links) / (telemetry.total_links || 1)) * 100).toFixed(0)}%
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              ({telemetry.breached_links} alerts)
            </span>
          </div>
        </div>
      </div>

      {/* IPFIX Live Top-Talkers Stream */}
      <div className="noc-panel" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowDownUp size={14} color="#00f0ff" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>LIVE IPFIX FLOW TELEMETRY (1Hz SAMPLE)</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>DSCP Prioritized</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
          {telemetry.top_flows.map(flow => (
            <div
              key={flow.flow_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 60px 80px',
                gap: '8px',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '4px',
                fontSize: '0.72rem'
              }}
            >
              <span className="mono-val" style={{ color: '#38bdf8' }}>{flow.app_tag}</span>
              <span className="mono-val" style={{ color: 'var(--text-muted)' }}>{flow.src_ip}:{flow.src_port}</span>
              <span className="mono-val" style={{ color: 'var(--text-muted)' }}>➔ {flow.dst_ip}:{flow.dst_port}</span>
              <span
                className="mono-val"
                style={{
                  color: flow.dscp === 'EF' ? '#00ff88' : flow.dscp === 'AF41' ? '#00f0ff' : '#94a3b8',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  textAlign: 'center'
                }}
              >
                {flow.dscp}
              </span>
              <span className="mono-val" style={{ color: '#e2e8f0', textAlign: 'right' }}>
                {(flow.bytes_sec / 125000).toFixed(1)} Mbps
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
