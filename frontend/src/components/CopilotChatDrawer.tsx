import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Send, Bot, User, Sparkles, BookOpen } from 'lucide-react';

interface ChatMessage {
  sender: 'USER' | 'COPILOT';
  text: string;
  structured?: any;
  timestamp: string;
}

interface CopilotChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRunbook: (sopId: string) => void;
}

export const CopilotChatDrawer: React.FC<CopilotChatDrawerProps> = ({
  isOpen,
  onClose,
  onOpenRunbook
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'COPILOT',
      text: "AegisNOC Offline AI Copilot online. I analyze real-time sliding-window precursors (EWMA drift, BGP stress, IPSec degradation) and ground decisions in local ChromaDB vector SOPs.\n\nAsk me anything about network failures, contributing signals, or automated remediation.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendMessage = async (queryToSend?: string) => {
    const q = queryToSend || inputQuery;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: 'USER',
      text: q,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.chatCopilot(q);
      const botMsg: ChatMessage = {
        sender: 'COPILOT',
        text: res.natural_language_response,
        structured: res.structured_analysis,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error('Copilot chat error:', e);
      setMessages(prev => [
        ...prev,
        {
          sender: 'COPILOT',
          text: "Local reasoning engine error. Ensure backend service is running.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    "Q1: What is likely to fail next and when?",
    "Q2: Which signals contributed to elevated risk?",
    "Q3: What corrective action is recommended?"
  ];

  return (
    <div
      className="noc-panel"
      style={{
        position: 'fixed',
        top: '65px',
        right: '16px',
        width: '460px',
        height: 'calc(100vh - 80px)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85)',
        border: '1px solid var(--border-active)',
        background: 'rgba(8, 12, 20, 0.98)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(15, 23, 42, 0.9)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(0, 240, 255, 0.15)', padding: '5px', borderRadius: '5px' }}>
            <Bot size={16} color="#00f0ff" />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>AegisNOC Predictive AI Copilot</div>
            <div style={{ fontSize: '0.68rem', color: '#00ff88' }}>● 100% Offline Local Inference (Air-Gapped)</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            className="tactical-btn"
            style={{ fontSize: '0.68rem', padding: '3px 8px', whiteSpace: 'nowrap' }}
            onClick={() => handleSendMessage(p)}
          >
            <Sparkles size={11} color="#00f0ff" /> {p.slice(0, 24)}...
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.sender === 'USER' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              {m.sender === 'USER' ? <User size={12} /> : <Bot size={12} color="#00f0ff" />}
              <span>{m.sender === 'USER' ? 'Operator' : 'Copilot'} • {m.timestamp}</span>
            </div>

            <div
              style={{
                maxWidth: '92%',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                lineHeight: '1.4',
                background: m.sender === 'USER' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.8)',
                border: m.sender === 'USER' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                whiteSpace: 'pre-wrap'
              }}
            >
              {m.text}

              {/* Structured SOP Card if attached */}
              {m.structured?.automation_runbook_id && m.structured.automation_runbook_id !== 'SOP-NOMINAL-MONITOR' && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    className="tactical-btn"
                    style={{ fontSize: '0.7rem', padding: '3px 8px', background: 'rgba(0,255,136,0.1)', color: '#00ff88', borderColor: '#00ff88' }}
                    onClick={() => onOpenRunbook(m.structured.automation_runbook_id)}
                  >
                    <BookOpen size={12} /> View Matched SOP: {m.structured.automation_runbook_id}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <Bot size={14} color="#00f0ff" />
            <span>Local LLM is synthesizing precursor telemetry & vector SOPs...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', background: 'rgba(10, 16, 28, 0.95)' }}>
        <input
          type="text"
          placeholder="Ask Copilot about impending failures, signals, or SOPs..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          style={{
            flex: 1,
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '0.8rem'
          }}
        />
        <button
          className="tactical-btn"
          style={{ padding: '8px 12px', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', borderColor: '#00f0ff' }}
          onClick={() => handleSendMessage()}
          disabled={loading}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};
