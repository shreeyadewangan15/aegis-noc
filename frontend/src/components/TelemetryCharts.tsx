import React, { useState, useEffect } from 'react';
import type { TelemetryLiveSnapshot } from '../types';
import { api } from '../services/api';
import { Activity, Gauge, TrendingUp, Zap } from 'lucide-react';

interface TelemetryChartsProps {
  telemetry: TelemetryLiveSnapshot | null;
  telemetryTick: number;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ telemetry, telemetryTick }) => {
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, [telemetryTick]);

  const loadHistory = async () => {
    try {
      const data = await api.getSystemHistory(30);
      setHistoryData(data.history || []);
    } catch (e) {
      console.error('Failed to load chart history:', e);
    }
  };

  // Helper to build SVG path from array of numbers
  const buildSvgPath = (points: number[], width = 240, height = 45, maxVal?: number) => {
    if (!points || points.length < 2) return '';
    const actualMax = maxVal || Math.max(...points, 1.0);
    const stepX = width / (points.length - 1);

    const coords = points.map((p, i) => {
      const x = i * stepX;
      const y = height - (Math.min(actualMax, Math.max(0, p)) / actualMax) * (height - 6) - 3;
      return `${x},${y}`;
    });

    return `M ${coords.join(' L ')}`;
  };

  const latencies = historyData.map(h => h.avg_latency_ms || 0);
  const jitters = historyData.map(h => h.avg_jitter_ms || 0);
  const discards = historyData.map(h => h.total_buffer_discards_sec || 0);

  // Derive active BGP flap counts & interface max load
  const maxInterfaceLoad = telemetry
    ? Math.max(...Object.values(telemetry.links).map(l => l.tx_util_pct || 0), 25)
    : 28;

  const totalBgpFlaps = telemetry
    ? Object.values(telemetry.nodes).reduce((acc, n) => acc + n.bgp_sessions.reduce((sAcc, s) => sAcc + s.flap_count, 0), 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* 4 Sparkline Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {/* Sparkline 1: Average Latency */}
        <div className="noc-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>AVG SYSTEM LATENCY</span>
            <Activity size={12} color="#00f0ff" />
          </div>
          <div className="mono-val" style={{ fontSize: '1rem', color: '#00f0ff' }}>
            {latencies.length ? latencies[latencies.length - 1].toFixed(1) : '0.0'} ms
          </div>
          <svg viewBox="0 0 240 45" style={{ width: '100%', height: '32px', overflow: 'visible' }}>
            <path
              d={buildSvgPath(latencies, 240, 45, 120)}
              fill="none"
              stroke="#00f0ff"
              strokeWidth="1.8"
            />
          </svg>
        </div>

        {/* Sparkline 2: Jitter Drift */}
        <div className="noc-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>JITTER DRIFT</span>
            <Gauge size={12} color="#a855f7" />
          </div>
          <div className="mono-val" style={{ fontSize: '1rem', color: '#a855f7' }}>
            {jitters.length ? jitters[jitters.length - 1].toFixed(1) : '0.0'} ms
          </div>
          <svg viewBox="0 0 240 45" style={{ width: '100%', height: '32px', overflow: 'visible' }}>
            <path
              d={buildSvgPath(jitters, 240, 45, 30)}
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.8"
            />
          </svg>
        </div>

        {/* Sparkline 3: Max Line Saturation % */}
        <div className="noc-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>PEAK INTERFACE TX LOAD</span>
            <TrendingUp size={12} color={maxInterfaceLoad > 85 ? '#ff2255' : '#00ff88'} />
          </div>
          <div className="mono-val" style={{ fontSize: '1rem', color: maxInterfaceLoad > 85 ? '#ff2255' : '#00ff88' }}>
            {maxInterfaceLoad.toFixed(1)}%
          </div>
          {/* Progress Bar with 95% threshold line */}
          <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, maxInterfaceLoad)}%`,
                height: '100%',
                background: maxInterfaceLoad > 85 ? '#ff2255' : maxInterfaceLoad > 70 ? '#ffb700' : '#00ff88',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Sparkline 4: Total Buffer Discards / BGP Flaps */}
        <div className="noc-panel" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>BUFFER DISCARDS / FLAPS</span>
            <Zap size={12} color={discards.length && discards[discards.length - 1] > 50 ? '#ff2255' : '#ffb700'} />
          </div>
          <div className="mono-val" style={{ fontSize: '1rem', color: discards.length && discards[discards.length - 1] > 50 ? '#ff2255' : '#e2e8f0' }}>
            {discards.length ? discards[discards.length - 1].toFixed(0) : '0'} drops/s <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>({totalBgpFlaps} flaps)</span>
          </div>
          <svg viewBox="0 0 240 45" style={{ width: '100%', height: '32px', overflow: 'visible' }}>
            <path
              d={buildSvgPath(discards, 240, 45, 1000)}
              fill="none"
              stroke="#ffb700"
              strokeWidth="1.8"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
