import React from 'react';
import type { NetworkNode, NodeTelemetry, NetworkLink, LinkTelemetry } from '../types';
import { X, Server, Network, Cpu, HardDrive, Thermometer, ShieldAlert, GitCommit } from 'lucide-react';

interface NodeDetailDrawerProps {
  selectedNode: NetworkNode | null;
  selectedLink: NetworkLink | null;
  nodeTelemetry: NodeTelemetry | null;
  linkTelemetry: LinkTelemetry | null;
  onClose: () => void;
  onOpenBlastRadius: (entityId: string) => void;
  onInjectAnomaly: (scenario: string, targetId: string) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  selectedNode,
  selectedLink,
  nodeTelemetry,
  linkTelemetry,
  onClose,
  onOpenBlastRadius,
  onInjectAnomaly
}) => {
  if (!selectedNode && !selectedLink) return null;

  return (
    <div
      className="noc-panel"
      style={{
        position: 'fixed',
        top: '70px',
        right: '16px',
        width: '420px',
        maxHeight: 'calc(100vh - 90px)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 35px rgba(0, 0, 0, 0.7)',
        border: '1px solid var(--border-active)',
        background: 'rgba(10, 16, 28, 0.95)',
        backdropFilter: 'blur(16px)'
      }}
    >
      {/* Drawer Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(15, 23, 42, 0.8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedNode ? <Server size={18} color="#00f0ff" /> : <Network size={18} color="#00ff88" />}
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              {selectedNode ? selectedNode.id : selectedLink?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {selectedNode ? `${selectedNode.role} Router • ${selectedNode.hostname}` : `${selectedLink?.layer} Link • ${selectedLink?.id}`}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* If NODE selected */}
        {selectedNode && (
          <>
            {/* Live Node Hardware Telemetry */}
            {nodeTelemetry && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={12} color="#00f0ff" /> CPU UTIL
                  </div>
                  <div className="mono-val" style={{ fontSize: '1.1rem', color: nodeTelemetry.cpu_util_pct > 80 ? '#ff2255' : '#00f0ff' }}>
                    {nodeTelemetry.cpu_util_pct}%
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HardDrive size={12} color="#a855f7" /> MEMORY
                  </div>
                  <div className="mono-val" style={{ fontSize: '1.1rem', color: '#a855f7' }}>
                    {nodeTelemetry.memory_util_pct}%
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Thermometer size={12} color="#ffb700" /> TEMP
                  </div>
                  <div className="mono-val" style={{ fontSize: '1.1rem', color: '#ffb700' }}>
                    {nodeTelemetry.temperature_c}°C
                  </div>
                </div>
              </div>
            )}

            {/* Hardware & Identity Info */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Hardware Model:</span>
                <span className="mono-val">{selectedNode.device_model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>OS Version:</span>
                <span className="mono-val">{selectedNode.os_version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>System ASN:</span>
                <span className="mono-val">{selectedNode.system_asn}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Loopback IP:</span>
                <span className="mono-val" style={{ color: '#00f0ff' }}>{selectedNode.loopback_ip}</span>
              </div>
            </div>

            {/* BGP Peering State Machine */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GitCommit size={14} color="#00f0ff" />
                BGP PEERING SESSIONS ({selectedNode.bgp_peers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedNode.bgp_peers.map(peer => {
                  const livePeer = nodeTelemetry?.bgp_sessions.find(s => s.peer_id === peer.peer_id);
                  const isEstablished = livePeer?.state === 'Established';

                  return (
                    <div
                      key={peer.peer_id}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.3)',
                        border: isEstablished ? '1px solid rgba(0,255,136,0.2)' : '1px solid rgba(255,34,85,0.4)',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600 }}>{peer.peer_id} (AS{peer.remote_asn})</span>
                        <span
                          className="mono-val"
                          style={{
                            color: isEstablished ? '#00ff88' : '#ff2255',
                            fontWeight: 700,
                            padding: '1px 6px',
                            background: isEstablished ? 'rgba(0,255,136,0.1)' : 'rgba(255,34,85,0.1)',
                            borderRadius: '3px'
                          }}
                        >
                          {livePeer?.state || 'Established'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)' }}>
                        <span>IP: {peer.peer_ip}</span>
                        <span>Flaps: {livePeer?.flap_count ?? 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Physical & Logical Interfaces */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>
                INTERFACES ({selectedNode.interfaces.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedNode.interfaces.map(iface => (
                  <div
                    key={iface.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                      fontSize: '0.7rem'
                    }}
                  >
                    <div>
                      <div className="mono-val" style={{ color: '#e2e8f0' }}>{iface.name}</div>
                      <div style={{ color: 'var(--text-dim)' }}>{iface.role} • {iface.speed_gbps}Gbps</div>
                    </div>
                    <span className="mono-val" style={{ color: '#38bdf8' }}>{iface.ip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                className="tactical-btn"
                style={{ flex: 1 }}
                onClick={() => onOpenBlastRadius(selectedNode.id)}
              >
                <ShieldAlert size={14} color="#ffb700" /> Blast Radius
              </button>
              <button
                className="tactical-btn tactical-btn-danger"
                style={{ flex: 1 }}
                onClick={() => onInjectAnomaly('BGP_FLAP', selectedNode.id)}
              >
                Simulate Flap
              </button>
            </div>
          </>
        )}

        {/* If LINK selected */}
        {selectedLink && (
          <>
            {/* Live Link Telemetry */}
            {linkTelemetry && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>LATENCY</div>
                  <div className="mono-val" style={{ fontSize: '1.1rem', color: linkTelemetry.sla_state === 'BREACHED' ? '#ff2255' : '#00f0ff' }}>
                    {linkTelemetry.latency_ms}ms
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>JITTER</div>
                  <div className="mono-val" style={{ fontSize: '1.1rem', color: '#a855f7' }}>
                    {linkTelemetry.jitter_ms}ms
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TX LOAD</div>
                  <div className="mono-val" style={{ fontSize: '1.1rem', color: linkTelemetry.tx_util_pct > 80 ? '#ff2255' : '#00ff88' }}>
                    {linkTelemetry.tx_util_pct}%
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Endpoints:</span>
                <span className="mono-val">{selectedLink.source} ➔ {selectedLink.target}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Capacity:</span>
                <span className="mono-val">{selectedLink.capacity_mbps.toLocaleString()} Mbps</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>SLA Latency Target:</span>
                <span className="mono-val">&lt; {selectedLink.sla_latency_threshold_ms}ms</span>
              </div>
              {selectedLink.encryption && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Crypto:</span>
                  <span className="mono-val" style={{ color: '#00f0ff' }}>{selectedLink.encryption}</span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                className="tactical-btn"
                style={{ flex: 1 }}
                onClick={() => onOpenBlastRadius(selectedLink.id)}
              >
                <ShieldAlert size={14} color="#ffb700" /> Blast Radius
              </button>
              <button
                className="tactical-btn tactical-btn-danger"
                style={{ flex: 1 }}
                onClick={() => onInjectAnomaly('LATENCY_SPIKE', selectedLink.id)}
              >
                Inject Spike
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
