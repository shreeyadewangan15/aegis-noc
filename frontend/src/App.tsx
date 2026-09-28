import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import type {
  NetworkTopology,
  TelemetryLiveSnapshot,
  HealthStatus,
  NetworkNode,
  NetworkLink
} from './types';

import { AirgapStatusBadge } from './components/AirgapStatusBadge';
import { PredictiveHorizon } from './components/PredictiveHorizon';
import { TopologyMap } from './components/TopologyMap';
import { TelemetryCharts } from './components/TelemetryCharts';
import { FaultInjector } from './components/FaultInjector';
import { CopilotTerminal } from './components/CopilotTerminal';
import { TelemetryStreamGrid } from './components/TelemetryStreamGrid';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { AnomalyAlertBanner } from './components/AnomalyAlertBanner';
import { RunbookSearchModal } from './components/RunbookSearchModal';
import { BlastRadiusModal } from './components/BlastRadiusModal';
import { CopilotChatDrawer } from './components/CopilotChatDrawer';

import { Shield, BookOpen, RefreshCw, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  const [topology, setTopology] = useState<NetworkTopology | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryLiveSnapshot | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<NetworkLink | null>(null);

  const [blastRadiusEntityId, setBlastRadiusEntityId] = useState<string | null>(null);
  const [runbookModalOpen, setRunbookModalOpen] = useState<boolean>(false);
  const [runbookInitialQuery, setRunbookInitialQuery] = useState<string>('');
  const [terminalOpen, setTerminalOpen] = useState<boolean>(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    // Initial fetch
    loadInitialData();

    // Setup SSE Stream for 1Hz real-time telemetry
    const eventSource = api.createTelemetryEventSource(
      (data) => {
        setTelemetry(data);
      },
      (err) => {
        console.warn('SSE disconnected, polling fallback:', err);
      }
    );

    // Periodic health poller (every 3s)
    const healthInterval = setInterval(() => {
      api.getHealth().then(setHealth).catch(console.error);
    }, 3000);

    return () => {
      eventSource.close();
      clearInterval(healthInterval);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [topData, liveData, healthData] = await Promise.all([
        api.getTopology(),
        api.getLiveTelemetry(),
        api.getHealth()
      ]);
      setTopology(topData);
      setTelemetry(liveData);
      setHealth(healthData);
    } catch (e) {
      console.error('Initial load failed:', e);
    }
  };

  const handleSelectNode = (node: NetworkNode) => {
    setSelectedNode(node);
    setSelectedLink(null);
  };

  const handleSelectLink = (link: NetworkLink) => {
    setSelectedLink(link);
    setSelectedNode(null);
  };

  const handleInjectAnomaly = async (scenario: string, targetId: string, duration = 60) => {
    try {
      await api.injectAnomaly(scenario, targetId, duration);
      const snap = await api.getLiveTelemetry();
      setTelemetry(snap);
    } catch (e) {
      console.error('Injection failed:', e);
    }
  };

  const handleClearAnomalies = async () => {
    try {
      await api.clearAnomalies();
      const snap = await api.getLiveTelemetry();
      setTelemetry(snap);
    } catch (e) {
      console.error('Clear failed:', e);
    }
  };

  const handleOpenRunbook = (query: string) => {
    setRunbookInitialQuery(query);
    setRunbookModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Top Mission-Control Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 18px',
          background: 'rgba(10, 16, 28, 0.95)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(12px)'
        }}
      >
        {/* Brand & Platform Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #00f0ff 0%, #3b82f6 100%)',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0,240,255,0.4)'
          }}>
            <Shield size={20} color="#06090e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AEGIS<span style={{ color: '#00f0ff' }}>NOC</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                SD-WAN / MPLS
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              Air-Gapped Autonomous Predictive Network Operations Center
            </div>
          </div>
        </div>

        {/* Airgap Verification Badges */}
        <AirgapStatusBadge health={health} tickCount={telemetry?.tick_count ?? 0} />

        {/* Action Shortcuts */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="tactical-btn"
            style={{ background: 'rgba(0, 240, 255, 0.12)', borderColor: '#00f0ff', color: '#00f0ff' }}
            onClick={() => setTerminalOpen(true)}
          >
            <Terminal size={14} />
            <span>Copilot Terminal</span>
          </button>
          <button
            className="tactical-btn"
            onClick={() => handleOpenRunbook('')}
          >
            <BookOpen size={14} color="#00f0ff" />
            <span>SOP Runbooks</span>
          </button>
          <button
            className="tactical-btn"
            onClick={loadInitialData}
          >
            <RefreshCw size={14} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 16px 14px 16px', overflow: 'hidden' }}>
        {/* Predictive Horizon (Q1/Q2/Q3 Decision & Lead Time Card) */}
        <PredictiveHorizon
          telemetryTick={telemetry?.tick_count ?? 0}
          onOpenRunbook={handleOpenRunbook}
          onOpenTerminal={() => setTerminalOpen(true)}
        />

        {/* Anomaly & SLA Violation Alert Banner */}
        <AnomalyAlertBanner
          alerts={telemetry?.active_alerts || []}
          onOpenRunbook={handleOpenRunbook}
        />

        {/* Split Grid */}
        <div className="main-content-grid" style={{ flex: 1, padding: 0 }}>
          {/* Left Column: Interactive Topology Map + Built-in Fault Injection Dock */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, minHeight: '340px' }}>
              <TopologyMap
                topology={topology}
                telemetry={telemetry}
                selectedNodeId={selectedNode?.id || null}
                selectedLinkId={selectedLink?.id || null}
                onSelectNode={handleSelectNode}
                onSelectLink={handleSelectLink}
                onOpenBlastRadius={(id) => setBlastRadiusEntityId(id)}
              />
            </div>

            {/* Built-in Fault Injection Console (4 Validation Scenarios) */}
            <FaultInjector
              activeAnomaliesCount={telemetry?.active_anomalies_count ?? 0}
              onInject={handleInjectAnomaly}
              onClear={handleClearAnomalies}
            />
          </div>

          {/* Right Column: Telemetry Sparklines + Live Telemetry Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '100%' }}>
            {/* Real-time Sparklines */}
            <TelemetryCharts
              telemetry={telemetry}
              telemetryTick={telemetry?.tick_count ?? 0}
            />

            {/* Telemetry Stream & IPFIX Gauges */}
            <TelemetryStreamGrid
              telemetry={telemetry}
            />
          </div>
        </div>
      </main>

      {/* Copilot Terminal Modal */}
      <CopilotTerminal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        onOpenRunbook={handleOpenRunbook}
      />

      {/* Node / Link Deep Inspection Drawer */}
      <NodeDetailDrawer
        selectedNode={selectedNode}
        selectedLink={selectedLink}
        nodeTelemetry={selectedNode && telemetry?.nodes[selectedNode.id] ? telemetry.nodes[selectedNode.id] : null}
        linkTelemetry={selectedLink && telemetry?.links[selectedLink.id] ? telemetry.links[selectedLink.id] : null}
        onClose={() => {
          setSelectedNode(null);
          setSelectedLink(null);
        }}
        onOpenBlastRadius={(id) => setBlastRadiusEntityId(id)}
        onInjectAnomaly={(scen, target) => handleInjectAnomaly(scen, target, 45)}
      />

      {/* Offline Vector RAG Modal */}
      <RunbookSearchModal
        isOpen={runbookModalOpen}
        initialQuery={runbookInitialQuery}
        onClose={() => setRunbookModalOpen(false)}
      />

      {/* Blast Radius Calculation Modal */}
      <BlastRadiusModal
        entityId={blastRadiusEntityId}
        onClose={() => setBlastRadiusEntityId(null)}
      />

      {/* Interactive AI Copilot Chat Drawer */}
      <CopilotChatDrawer
        isOpen={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
        onOpenRunbook={handleOpenRunbook}
      />
    </div>
  );
};

export default App;
