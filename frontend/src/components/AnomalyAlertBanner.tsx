import React from 'react';
import type { AlertEvent } from '../types';
import { AlertTriangle, BookOpen, ChevronRight } from 'lucide-react';

interface AnomalyAlertBannerProps {
  alerts: AlertEvent[];
  onOpenRunbook: (query: string) => void;
}

export const AnomalyAlertBanner: React.FC<AnomalyAlertBannerProps> = ({ alerts, onOpenRunbook }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div
        className="noc-panel"
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(0, 255, 136, 0.05)',
          border: '1px solid rgba(0, 255, 136, 0.2)'
        }}
      >
        <div className="pulse-dot-green" />
        <span style={{ fontSize: '0.78rem', color: '#00ff88', fontWeight: 600 }}>
          ALL ENTERPRISE SD-WAN PATHS OPTIMAL • ZERO CRITICAL ALERTS
        </span>
      </div>
    );
  }

  const latestAlert = alerts[0];
  const isCritical = latestAlert.severity === 'CRITICAL';

  return (
    <div
      className="noc-panel"
      style={{
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isCritical ? 'rgba(255, 34, 85, 0.12)' : 'rgba(255, 183, 0, 0.1)',
        border: isCritical ? '1px solid var(--border-critical)' : '1px solid rgba(255, 183, 0, 0.4)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className={isCritical ? 'pulse-dot-red' : 'pulse-dot-cyan'} />
        <AlertTriangle size={16} color={isCritical ? '#ff2255' : '#ffb700'} />
        <div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isCritical ? '#ff2255' : '#ffb700', marginRight: '8px' }}>
            [{latestAlert.severity}] {latestAlert.title}
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-main)' }}>
            {latestAlert.description}
          </span>
        </div>
      </div>

      <button
        className="tactical-btn"
        style={{ fontSize: '0.72rem', padding: '4px 10px' }}
        onClick={() => onOpenRunbook(latestAlert.title + ' ' + latestAlert.description)}
      >
        <BookOpen size={13} color="#00f0ff" />
        <span>Triage Runbook</span>
        <ChevronRight size={13} />
      </button>
    </div>
  );
};
