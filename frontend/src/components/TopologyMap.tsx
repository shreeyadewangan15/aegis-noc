import React, { useState } from 'react';
import type { NetworkTopology, NetworkNode, NetworkLink, TelemetryLiveSnapshot } from '../types';
import { Network, Target } from 'lucide-react';

interface TopologyMapProps {
  topology: NetworkTopology | null;
  telemetry: TelemetryLiveSnapshot | null;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onSelectNode: (node: NetworkNode) => void;
  onSelectLink: (link: NetworkLink) => void;
  onOpenBlastRadius: (entityId: string) => void;
}

// Fixed geometric layout for enterprise topology canvas (viewBox 0 0 960 540)
const NODE_COORDINATES: Record<string, { x: number; y: number; label: string; sub: string }> = {
  // Primary Datacenter (Ashburn)
  'DC1-CE-01': { x: 120, y: 90, label: 'DC1-CE-01', sub: 'Ashburn Primary' },
  'DC1-CE-02': { x: 120, y: 180, label: 'DC1-CE-02', sub: 'Ashburn Secondary' },

  // Regional Hubs
  'HUB-EAST-CE-01': { x: 840, y: 120, label: 'HUB-EAST', sub: 'Atlanta Aggregation' },
  'HUB-WEST-CE-01': { x: 840, y: 380, label: 'HUB-WEST', sub: 'Denver Aggregation' },

  // MPLS Core & PE Ring
  'PE-01': { x: 330, y: 110, label: 'PE-01', sub: 'SP POP East-1' },
  'PE-02': { x: 330, y: 230, label: 'PE-02', sub: 'SP POP East-2' },
  'P-CORE-01': { x: 480, y: 150, label: 'P-CORE-01', sub: 'Core East 400G' },
  'P-CORE-02': { x: 480, y: 330, label: 'P-CORE-02', sub: 'Core West 400G' },
  'PE-03': { x: 630, y: 350, label: 'PE-03', sub: 'SP POP West-1' },
  'PE-04': { x: 630, y: 210, label: 'PE-04', sub: 'SP POP South-1' },

  // Branch CEs
  'BR-NYC-CE-01': { x: 220, y: 460, label: 'BR-NYC', sub: 'Financial Branch' },
  'BR-CHI-CE-01': { x: 420, y: 480, label: 'BR-CHI', sub: 'Logistics Branch' },
  'BR-SFO-CE-01': { x: 650, y: 480, label: 'BR-SFO', sub: 'Tech Branch' },
  'BR-MIA-CE-01': { x: 840, y: 480, label: 'BR-MIA', sub: 'Operations Branch' }
};

export const TopologyMap: React.FC<TopologyMapProps> = ({
  topology,
  telemetry,
  selectedNodeId,
  selectedLinkId,
  onSelectNode,
  onSelectLink,
  onOpenBlastRadius
}) => {
  const [layerFilter, setLayerFilter] = useState<'ALL' | 'UNDERLAY' | 'OVERLAY'>('ALL');

  if (!topology) {
    return (
      <div className="noc-panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Loading enterprise SD-WAN topology map...</span>
      </div>
    );
  }

  const filteredLinks = topology.links.filter(link => {
    if (layerFilter === 'ALL') return true;
    return link.layer === layerFilter;
  });

  const getLinkColor = (link: NetworkLink) => {
    const liveLink = telemetry?.links[link.id];
    if (!liveLink) {
      return link.layer === 'OVERLAY' ? '#00f0ff' : '#475569';
    }
    if (liveLink.status === 'DOWN' || liveLink.sla_state === 'BREACHED') return '#ff2255';
    if (liveLink.sla_state === 'WARNING' || liveLink.tx_util_pct > 75) return '#ffb700';
    return link.layer === 'OVERLAY' ? '#00f0ff' : '#00ff88';
  };

  const getNodeColor = (node: NetworkNode) => {
    const liveNode = telemetry?.nodes[node.id];
    if (liveNode?.status === 'DEGRADED') return '#ffb700';
    if (liveNode?.status === 'OFFLINE') return '#ff2255';
    if (node.role === 'CE') return '#38bdf8';
    if (node.role === 'PE') return '#a855f7';
    return '#ec4899'; // P Core
  };

  return (
    <div className="noc-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Header Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 16, 28, 0.95)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={16} color="#00f0ff" />
          <span style={{ fontSize: '0.86rem', fontWeight: 700, letterSpacing: '0.03em' }}>
            ENTERPRISE SD-WAN / MPLS TOPOLOGY MAP
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
            {topology.nodes.length} Nodes • {filteredLinks.length} Active Links
          </span>
        </div>

        {/* Layer Filters & Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedNodeId && (
            <button
              className="tactical-btn"
              style={{ fontSize: '0.7rem', padding: '3px 8px', borderColor: '#a855f7', color: '#a855f7' }}
              onClick={() => onOpenBlastRadius(selectedNodeId)}
            >
              <Target size={12} />
              <span>Blast Radius ({selectedNodeId})</span>
            </button>
          )}

          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '4px' }}>Layer:</span>
          <button
            className={`tactical-btn ${layerFilter === 'ALL' ? 'tactical-btn-active' : ''}`}
            onClick={() => setLayerFilter('ALL')}
          >
            Combined
          </button>
          <button
            className={`tactical-btn ${layerFilter === 'UNDERLAY' ? 'tactical-btn-active' : ''}`}
            onClick={() => setLayerFilter('UNDERLAY')}
          >
            MPLS Underlay
          </button>
          <button
            className={`tactical-btn ${layerFilter === 'OVERLAY' ? 'tactical-btn-active' : ''}`}
            onClick={() => setLayerFilter('OVERLAY')}
          >
            IPSec Overlay
          </button>
        </div>
      </div>

      {/* SVG Topology Visualizer */}
      <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.65) 0%, rgba(6,9,14,0.98) 100%)' }}>
        <svg
          viewBox="0 0 960 540"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.035)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="960" height="540" fill="url(#canvas-grid)" />

          {/* Render Links */}
          <g>
            {filteredLinks.map(link => {
              const srcCoord = NODE_COORDINATES[link.source];
              const tgtCoord = NODE_COORDINATES[link.target];
              if (!srcCoord || !tgtCoord) return null;

              const liveLink = telemetry?.links[link.id];
              const isSelected = selectedLinkId === link.id;
              const color = getLinkColor(link);
              const isOverlay = link.layer === 'OVERLAY';

              const midX = (srcCoord.x + tgtCoord.x) / 2;
              const midY = (srcCoord.y + tgtCoord.y) / 2;

              return (
                <g key={link.id} style={{ cursor: 'pointer' }} onClick={() => onSelectLink(link)}>
                  {/* Selection glow */}
                  {isSelected && (
                    <line
                      x1={srcCoord.x}
                      y1={srcCoord.y}
                      x2={tgtCoord.x}
                      y2={tgtCoord.y}
                      stroke="#00f0ff"
                      strokeWidth="6"
                      opacity="0.65"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Main Link Stroke */}
                  <line
                    x1={srcCoord.x}
                    y1={srcCoord.y}
                    x2={tgtCoord.x}
                    y2={tgtCoord.y}
                    stroke={color}
                    strokeWidth={isOverlay ? (isSelected ? 3 : 2) : isSelected ? 3.5 : 2}
                    strokeDasharray={isOverlay ? '6,4' : undefined}
                    opacity={isSelected ? 1 : 0.85}
                  />

                  {/* Latency / SLA Badge */}
                  {liveLink && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-25"
                        y="-9"
                        width="50"
                        height="18"
                        rx="4"
                        fill="rgba(8, 12, 20, 0.92)"
                        stroke={color}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill={color}
                        fontSize="8.5"
                        fontFamily="var(--font-mono)"
                        fontWeight="700"
                      >
                        {liveLink.status === 'DOWN' ? 'CUT' : `${liveLink.latency_ms.toFixed(0)}ms`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Render Nodes */}
          <g>
            {topology.nodes.map(node => {
              const coord = NODE_COORDINATES[node.id];
              if (!coord) return null;

              const liveNode = telemetry?.nodes[node.id];
              const isSelected = selectedNodeId === node.id;
              const nodeColor = getNodeColor(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectNode(node)}
                >
                  {/* Selection Halo */}
                  {isSelected && (
                    <circle
                      r="22"
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="2.5"
                      strokeDasharray="4,2"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Base Circle */}
                  <circle
                    r="15"
                    fill="rgba(10, 16, 28, 0.95)"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? '2.5' : '1.8'}
                    filter={isSelected ? 'url(#glow)' : undefined}
                  />

                  {/* Role Text */}
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                  >
                    {node.role}
                  </text>

                  {/* Hostname Tag */}
                  <g transform="translate(0, 26)">
                    <rect
                      x="-48"
                      y="-9"
                      width="96"
                      height="16"
                      rx="3"
                      fill="rgba(6, 9, 14, 0.9)"
                      stroke="rgba(56, 189, 248, 0.2)"
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="8"
                      fontFamily="var(--font-mono)"
                      fontWeight="600"
                    >
                      {coord.label}
                    </text>
                  </g>

                  {/* Status Indicator Dot */}
                  {liveNode && (
                    <circle
                      cx="11"
                      cy="-11"
                      r="4.5"
                      fill={liveNode.status === 'ONLINE' ? '#00ff88' : '#ff2255'}
                      stroke="#06090e"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          background: 'rgba(8, 12, 20, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '6px 12px',
          display: 'flex',
          gap: '12px',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
            <span>Branch/DC CE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
            <span>MPLS PE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899' }} />
            <span>P Core (400G)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '2px', borderTop: '2px dashed #00f0ff' }} />
            <span>IPSec DMVPN Overlay</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '2px', background: '#00ff88' }} />
            <span>MPLS Underlay Trunk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
