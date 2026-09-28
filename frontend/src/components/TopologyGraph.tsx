import React, { useState } from 'react';
import type { NetworkTopology, NetworkNode, NetworkLink, TelemetryLiveSnapshot } from '../types';
import { Network } from 'lucide-react';

interface TopologyGraphProps {
  topology: NetworkTopology | null;
  telemetry: TelemetryLiveSnapshot | null;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onSelectNode: (node: NetworkNode) => void;
  onSelectLink: (link: NetworkLink) => void;
  onOpenBlastRadius: (entityId: string) => void;
}

// Geometric layout coordinates for enterprise topology canvas (viewBox 0 0 960 560)
const NODE_COORDINATES: Record<string, { x: number; y: number }> = {
  // Datacenter (Top Left Cluster)
  'DC1-CE-01': { x: 120, y: 100 },
  'DC1-CE-02': { x: 120, y: 190 },

  // Regional Hubs
  'HUB-EAST-CE-01': { x: 840, y: 130 },
  'HUB-WEST-CE-01': { x: 840, y: 390 },

  // MPLS Core & PE Ring
  'PE-01': { x: 330, y: 120 },
  'PE-02': { x: 330, y: 240 },
  'P-CORE-01': { x: 480, y: 160 },
  'P-CORE-02': { x: 480, y: 340 },
  'PE-03': { x: 630, y: 360 },
  'PE-04': { x: 630, y: 220 },

  // Branch CEs
  'BR-NYC-CE-01': { x: 220, y: 470 },
  'BR-CHI-CE-01': { x: 420, y: 490 },
  'BR-SFO-CE-01': { x: 650, y: 490 },
  'BR-MIA-CE-01': { x: 840, y: 490 }
};

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  topology,
  telemetry,
  selectedNodeId,
  selectedLinkId,
  onSelectNode,
  onSelectLink
}) => {
  const [layerFilter, setLayerFilter] = useState<'ALL' | 'UNDERLAY' | 'OVERLAY'>('ALL');

  if (!topology) {
    return (
      <div className="noc-panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Loading enterprise topology...</span>
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
      return link.layer === 'OVERLAY' ? '#00f0ff' : '#64748b';
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
        background: 'rgba(10, 16, 28, 0.9)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={16} color="#00f0ff" />
          <span style={{ fontSize: '0.88rem', fontWeight: 600, letterSpacing: '0.02em' }}>
            ENTERPRISE SD-WAN TOPOLOGY CANVAS
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
            {topology.nodes.length} Nodes / {filteredLinks.length} Links
          </span>
        </div>

        {/* Layer Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '4px' }}>Layer:</span>
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
      <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.6) 0%, rgba(6,9,14,0.95) 100%)' }}>
        <svg
          viewBox="0 0 960 560"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Grid Pattern */}
            <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.04)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="960" height="560" fill="url(#canvas-grid)" />

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

              // Midpoint for latency badge
              const midX = (srcCoord.x + tgtCoord.x) / 2;
              const midY = (srcCoord.y + tgtCoord.y) / 2;

              return (
                <g key={link.id} style={{ cursor: 'pointer' }} onClick={() => onSelectLink(link)}>
                  {/* Outer selection glow */}
                  {isSelected && (
                    <line
                      x1={srcCoord.x}
                      y1={srcCoord.y}
                      x2={tgtCoord.x}
                      y2={tgtCoord.y}
                      stroke="#00f0ff"
                      strokeWidth="6"
                      opacity="0.6"
                      filter="url(#glow)"
                    />
                  )}

                  {/* Main Link Line */}
                  <line
                    x1={srcCoord.x}
                    y1={srcCoord.y}
                    x2={tgtCoord.x}
                    y2={tgtCoord.y}
                    stroke={color}
                    strokeWidth={isOverlay ? (isSelected ? 3 : 2) : isSelected ? 3.5 : 2}
                    strokeDasharray={isOverlay ? '6,4' : undefined}
                    opacity={isSelected ? 1 : 0.8}
                  />

                  {/* Latency & Utilization Badge */}
                  {liveLink && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-24"
                        y="-8"
                        width="48"
                        height="16"
                        rx="3"
                        fill="rgba(8, 12, 20, 0.9)"
                        stroke={color}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={color}
                        fontSize="8.5"
                        fontFamily="var(--font-mono)"
                        fontWeight="600"
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
                  {/* Selection Ring */}
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

                  {/* Node Base Circle */}
                  <circle
                    r="15"
                    fill="rgba(10, 16, 28, 0.95)"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? '2.5' : '1.8'}
                    filter={isSelected ? 'url(#glow)' : undefined}
                  />

                  {/* Role Icon / Text */}
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

                  {/* Node Hostname Label */}
                  <g transform="translate(0, 26)">
                    <rect
                      x="-45"
                      y="-9"
                      width="90"
                      height="16"
                      rx="3"
                      fill="rgba(6, 9, 14, 0.85)"
                      stroke="rgba(56, 189, 248, 0.2)"
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="8.5"
                      fontFamily="var(--font-mono)"
                      fontWeight="500"
                    >
                      {node.id}
                    </text>
                  </g>

                  {/* CPU / Utilization Mini Badge */}
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

        {/* Floating Quick Legend & Actions */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '14px',
          background: 'rgba(8, 12, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          gap: '14px',
          fontSize: '0.72rem',
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
            <span>P Core</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '2px', background: '#00f0ff', borderTop: '1px dashed #00f0ff' }} />
            <span>IPSec Overlay</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '2px', background: '#00ff88' }} />
            <span>Underlay Trunk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
