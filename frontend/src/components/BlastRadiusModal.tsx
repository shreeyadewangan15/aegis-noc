import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, ShieldAlert } from 'lucide-react';

interface BlastRadiusModalProps {
  entityId: string | null;
  onClose: () => void;
}

export const BlastRadiusModal: React.FC<BlastRadiusModalProps> = ({ entityId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entityId) {
      calculate(entityId);
    }
  }, [entityId]);

  const calculate = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.calculateBlastRadius(id);
      setData(res);
    } catch (e) {
      console.error('Blast radius calculation failed:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!entityId) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div
        className="noc-panel"
        style={{
          width: '700px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 16, 28, 0.98)',
          border: '1px solid var(--border-critical)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(255, 34, 85, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#ff2255" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ff2255' }}>
              GRAPH BLAST-RADIUS FAILURE IMPACT ANALYSIS
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Evaluating graph topology paths and severed tunnels...
            </div>
          ) : data ? (
            <>
              {/* Impact Summary Pill */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SIMULATED TARGET</div>
                  <div className="mono-val" style={{ fontSize: '1rem', color: '#00f0ff' }}>{data.failed_entity_id}</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>CRITICALITY LEVEL</div>
                  <div className="mono-val" style={{ fontSize: '1rem', color: data.impact_criticality === 'HIGH' ? '#ff2255' : '#ffb700' }}>
                    {data.impact_criticality}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SEVERED OVERLAY TUNNELS</div>
                  <div className="mono-val" style={{ fontSize: '1rem', color: data.severed_overlay_tunnels_count > 0 ? '#ff2255' : '#00ff88' }}>
                    {data.severed_overlay_tunnels_count}
                  </div>
                </div>
              </div>

              {/* Severed Overlay Tunnels List */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: '#cbd5e1' }}>
                  AFFECTED SD-WAN IPSEC OVERLAY TUNNELS:
                </div>
                {data.severed_overlay_tunnels.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#00ff88', padding: '8px', background: 'rgba(0,255,136,0.05)', borderRadius: '4px' }}>
                    ✓ No overlay tunnels severed directly. Redundant MPLS underlay paths absorb the load.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {data.severed_overlay_tunnels.map((tun: any) => (
                      <div
                        key={tun.link_id}
                        style={{
                          background: 'rgba(255, 34, 85, 0.08)',
                          border: '1px solid rgba(255, 34, 85, 0.25)',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span className="mono-val" style={{ color: '#ff2255', fontWeight: 600 }}>{tun.link_id} - {tun.name}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{tun.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Branch Reachability Matrix */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: '#cbd5e1' }}>
                  BRANCH REACHABILITY MATRIX TO ASHBURN DATACENTER:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.entries(data.branch_reachability_matrix || {}).map(([branch, status]: [string, any]) => (
                    <div
                      key={branch}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.3)',
                        border: status.status === 'HEALTHY' ? '1px solid rgba(0,255,136,0.2)' : '1px solid rgba(255,34,85,0.4)',
                        fontSize: '0.72rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span className="mono-val">{branch}</span>
                      <span
                        className="mono-val"
                        style={{
                          color: status.status === 'HEALTHY' ? '#00ff88' : '#ff2255',
                          fontWeight: 600
                        }}
                      >
                        {status.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery Guidance */}
              <div style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.25)', padding: '10px', borderRadius: '4px', fontSize: '0.75rem' }}>
                <div style={{ fontWeight: 600, color: '#00f0ff', marginBottom: '3px' }}>Automated NOC Recovery Policy:</div>
                <div style={{ color: 'var(--text-main)' }}>{data.recommended_recovery_action}</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
