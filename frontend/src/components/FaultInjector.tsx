import React, { useState } from 'react';
import { Flame, RefreshCw, Zap, AlertTriangle, Play, TrendingUp, GitPullRequest } from 'lucide-react';

interface FaultInjectorProps {
  activeAnomaliesCount: number;
  onInject: (scenario: string, targetId: string, duration: number) => void;
  onClear: () => void;
}

export const FaultInjector: React.FC<FaultInjectorProps> = ({
  activeAnomaliesCount,
  onInject,
  onClear
}) => {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'PROGRESSIVE_CONGESTION',
      target: 'LINK-OVL-03',
      name: '1. Hub-to-Spoke Congestion Buildup',
      description: 'Gradual linear slope ramp to 96% with buffer queue accumulation',
      duration: 60,
      icon: TrendingUp,
      color: '#ffb700'
    },
    {
      id: 'BGP_CONVERGENCE_STORM',
      target: 'DC1-CE-01',
      name: '2. BGP Flapping & Route Storm',
      description: 'Session state oscillations, prefix churn, and hold-time expiry',
      duration: 60,
      icon: GitPullRequest,
      color: '#ff2255'
    },
    {
      id: 'UNDERLAY_FLAP_TUNNEL_FALLBACK',
      target: 'LINK-UND-04',
      name: '3. Underlay Flap with Tunnel Fallback',
      description: 'Intermittent carrier loss forcing IPSec dynamic tunnel failover',
      duration: 60,
      icon: Zap,
      color: '#00f0ff'
    },
    {
      id: 'POLICY_DRIFT_MISCONFIG',
      target: 'LINK-OVL-01',
      name: '4. Controller Policy Drift & DSCP Drop',
      description: 'QoS queue scheduling de-sync, rekey delays, and jitter surge',
      duration: 60,
      icon: AlertTriangle,
      color: '#a855f7'
    }
  ];

  const handleTrigger = (scen: typeof scenarios[0]) => {
    setActiveScenario(scen.id);
    onInject(scen.id, scen.target, scen.duration);
  };

  const handleClear = () => {
    setActiveScenario(null);
    onClear();
  };

  return (
    <div className="noc-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Flame size={16} color="#ffb700" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.03em' }}>
            BUILT-IN FAULT INJECTION DOCK (4 VALIDATION SCENARIOS)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeAnomaliesCount > 0 && (
            <span className="mono-val" style={{ fontSize: '0.7rem', color: '#ff2255', fontWeight: 700 }}>
              ● {activeAnomaliesCount} FAULTS ACTIVE
            </span>
          )}
          <button
            className="tactical-btn"
            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            onClick={handleClear}
          >
            <RefreshCw size={12} color="#00ff88" />
            <span>Restore Normal</span>
          </button>
        </div>
      </div>

      {/* 4 Scenario Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {scenarios.map(scen => {
          const Icon = scen.icon;
          const isTriggered = activeScenario === scen.id && activeAnomaliesCount > 0;

          return (
            <div
              key={scen.id}
              style={{
                background: isTriggered ? `${scen.color}15` : 'rgba(0,0,0,0.35)',
                border: isTriggered ? `1px solid ${scen.color}` : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Icon size={14} color={scen.color} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: isTriggered ? scen.color : '#e2e8f0' }}>
                    {scen.name}
                  </span>
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginBottom: '8px', lineHeight: '1.25' }}>
                  {scen.description}
                </div>
              </div>

              <button
                className="tactical-btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  padding: '4px 6px',
                  background: isTriggered ? `${scen.color}30` : undefined,
                  borderColor: isTriggered ? scen.color : undefined,
                  color: isTriggered ? '#ffffff' : undefined
                }}
                onClick={() => handleTrigger(scen)}
              >
                <Play size={11} /> {isTriggered ? 'Active (Drifting)' : 'Trigger Scenario'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
