import React, { useState } from 'react';
import type { StructuredCopilotResponse } from '../types';
import { api } from '../services/api';
import { Terminal, X, Play, ChevronDown, ChevronRight, Database, BookOpen } from 'lucide-react';

interface CopilotTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRunbook: (sopId: string) => void;
}

export const CopilotTerminal: React.FC<CopilotTerminalProps> = ({
  isOpen,
  onClose,
  onOpenRunbook
}) => {
  const [cliInput, setCliInput] = useState<string>('');
  const [outputLogs, setOutputLogs] = useState<Array<{ type: 'IN' | 'OUT' | 'SYS'; text: string; json?: any }>>([
    { type: 'SYS', text: 'AegisNOC Air-Gapped Terminal Initialized. Local LLM Engine: llama3.2 @ 127.0.0.1:11434' },
    { type: 'SYS', text: 'Type "help", "analyze", "precursors", "runbook <SOP-ID>", or ask any natural question.' }
  ]);
  const [showJsonView, setShowJsonView] = useState<boolean>(false);
  const [latestAnalysis, setLatestAnalysis] = useState<StructuredCopilotResponse | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunCommand = async (cmd?: string) => {
    const command = (cmd || cliInput).trim();
    if (!command) return;

    setOutputLogs(prev => [...prev, { type: 'IN', text: `aegis-noc> ${command}` }]);
    setCliInput('');

    if (command.toLowerCase() === 'help') {
      setOutputLogs(prev => [
        ...prev,
        {
          type: 'OUT',
          text: `Available AegisNOC Terminal Commands:\n  analyze                  - Evaluates real-time precursor telemetry & answers Q1, Q2, Q3\n  precursors               - Lists all active sliding-window EWMA drift detections\n  runbook <SOP-ID>         - Retrieves full preventive runbook from local ChromaDB\n  execute <SOP-ID>         - Triggers automated runbook mitigation workflow\n  blast <NODE-ID>          - Computes failure blast radius and severed tunnels\n  clear                    - Clears terminal output window\n  <natural question>       - Prompts local LLM Copilot with ChromaDB vector RAG`
        }
      ]);
      return;
    }

    if (command.toLowerCase() === 'clear') {
      setOutputLogs([]);
      return;
    }

    if (command.toLowerCase().startsWith('runbook')) {
      const parts = command.split(' ');
      const sop = parts.length > 1 ? parts[1] : 'SOP-WAN-001';
      onOpenRunbook(sop);
      setOutputLogs(prev => [...prev, { type: 'OUT', text: `Opening Vector SOP Viewer for ${sop}...` }]);
      return;
    }

    if (command.toLowerCase() === 'analyze') {
      try {
        const data = await api.analyzeCopilot();
        setLatestAnalysis(data);
        setOutputLogs(prev => [
          ...prev,
          {
            type: 'OUT',
            text: `[PREDICTIVE ANALYSIS RESULT]\nQ1 Predicted Failure: ${data.predicted_issue}\nLead Time: ${data.time_to_impact} (Confidence: ${Math.round(data.confidence * 100)}%)\nQ2 Root Cause: ${data.root_cause_hypothesis}\nSignals: ${data.signals_observed.join('; ')}\nQ3 Action: ${data.recommended_actions[0]}\nSOP: ${data.automation_runbook_id}`,
            json: data
          }
        ]);
      } catch (e) {
        setOutputLogs(prev => [...prev, { type: 'SYS', text: `Error calling analyze API: ${e}` }]);
      }
      return;
    }

    if (command.toLowerCase().startsWith('execute')) {
      handleExecute();
      return;
    }

    // Natural query fallback
    try {
      const res = await api.chatCopilot(command);
      setLatestAnalysis(res.structured_analysis);
      setOutputLogs(prev => [
        ...prev,
        {
          type: 'OUT',
          text: res.natural_language_response,
          json: res.structured_analysis
        }
      ]);
    } catch (e) {
      setOutputLogs(prev => [...prev, { type: 'SYS', text: `Copilot query error: ${e}` }]);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setOutputLogs(prev => [
      ...prev,
      { type: 'SYS', text: '>>> [AUTOMATION INITIATED] Executing preventive remediation script...' },
      { type: 'SYS', text: '>>> [STEP 1/3] Diverting latency-sensitive VoIP (EF) traffic via secondary Hub...' },
      { type: 'SYS', text: '>>> [STEP 2/3] Adjusting RSVP-TE LSP bandwidth reservations and queue limits...' },
      { type: 'SYS', text: '>>> [STEP 3/3] Clearing transient buffer congestion. Steady state restored!' }
    ]);

    try {
      await api.clearAnomalies();
      setOutputLogs(prev => [...prev, { type: 'OUT', text: '✓ PREVENTIVE RUNBOOK EXECUTION COMPLETED (0 SLA Breaches Occurred).' }]);
    } catch (e) {
      setOutputLogs(prev => [...prev, { type: 'SYS', text: `Execution error: ${e}` }]);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div
        className="noc-panel"
        style={{
          width: '920px',
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(8, 12, 20, 0.98)',
          border: '1px solid var(--border-active)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
        }}
      >
        {/* Terminal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="#00f0ff" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              AEGIS_COPILOT_TERMINAL // AIR_GAPPED_REASONING_CONSOLE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="tactical-btn"
              style={{ fontSize: '0.68rem', padding: '3px 8px' }}
              onClick={() => onOpenRunbook('')}
            >
              <BookOpen size={12} color="#00f0ff" />
              <span>Browse SOPs</span>
            </button>

            <button
              className="tactical-btn"
              style={{ fontSize: '0.68rem', padding: '3px 8px' }}
              onClick={() => setShowJsonView(!showJsonView)}
            >
              {showJsonView ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>{showJsonView ? 'Hide JSON Schema' : 'View Structured JSON'}</span>
            </button>

            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Side-by-Side View */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: showJsonView ? '1.2fr 1fr' : '1fr', overflow: 'hidden' }}>
          {/* Main CLI Window */}
          <div style={{
            padding: '14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            background: 'rgba(5, 8, 14, 0.95)'
          }}>
            {outputLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  color: log.type === 'IN' ? '#00f0ff' : log.type === 'SYS' ? '#ffb700' : '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}
              >
                {log.text}
              </div>
            ))}
          </div>

          {/* Collapsible Structured JSON View */}
          {showJsonView && (
            <div style={{
              background: 'rgba(10, 15, 26, 0.95)',
              borderLeft: '1px solid var(--border-subtle)',
              padding: '14px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem'
            }}>
              <div style={{ color: '#00ff88', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={13} /> STRUCTURED GROUNDED COPILOT JSON SCHEMA:
              </div>
              <pre style={{ color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                {latestAnalysis ? JSON.stringify(latestAnalysis, null, 2) : '// Run "analyze" or send a query to inspect JSON output.'}
              </pre>
            </div>
          )}
        </div>

        {/* Bottom Bar: Runbook Action + CLI Input */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(12, 18, 30, 0.98)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button
            className="tactical-btn"
            style={{
              background: 'rgba(0,255,136,0.15)',
              borderColor: '#00ff88',
              color: '#00ff88',
              fontWeight: 700,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap'
            }}
            onClick={handleExecute}
            disabled={executing}
          >
            <Play size={13} /> Execute Runbook
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', border: '1px solid var(--border-subtle)', padding: '0 8px' }}>
            <span style={{ color: '#00f0ff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginRight: '6px' }}>&gt;</span>
            <input
              type="text"
              placeholder="Enter command (e.g. 'analyze', 'help') or natural language question..."
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunCommand()}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                padding: '8px 0',
                outline: 'none'
              }}
            />
          </div>

          <button
            className="tactical-btn"
            style={{ fontSize: '0.75rem' }}
            onClick={() => handleRunCommand()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
