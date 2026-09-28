import React, { useState, useEffect } from 'react';
import type { Runbook } from '../types';
import { api } from '../services/api';
import { X, Search, BookOpen } from 'lucide-react';

interface RunbookSearchModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
}

export const RunbookSearchModal: React.FC<RunbookSearchModalProps> = ({
  isOpen,
  initialQuery = '',
  onClose
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Runbook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    } else {
      loadAllRunbooks();
    }
  }, [initialQuery, isOpen]);

  const loadAllRunbooks = async () => {
    try {
      setLoading(true);
      const data = await api.getRunbooks();
      setResults(data.runbooks);
    } catch (e) {
      console.error('Failed to load runbooks:', e);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      loadAllRunbooks();
      return;
    }
    try {
      setLoading(true);
      const data = await api.searchRCA(searchQuery);
      setResults(data.matched_runbooks);
    } catch (e) {
      console.error('RCA search error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          width: '780px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 16, 28, 0.98)',
          border: '1px solid var(--border-active)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="#00f0ff" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              OFFLINE VECTOR RCA & NOC TRIAGE RUNBOOKS
            </span>
            <span style={{ fontSize: '0.72rem', color: '#00ff88', background: 'rgba(0,255,136,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              100% AIR-GAPPED TF-IDF VECTOR MATCH
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', top: '10px', left: '10px' }} />
            <input
              type="text"
              placeholder="Search symptoms, alert text, BGP flaps, jitter drift, buffer discards..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch(query)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '8px 12px 8px 34px',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <button className="tactical-btn" onClick={() => performSearch(query)}>
            Search Vector Index
          </button>
        </div>

        {/* Results List */}
        <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Performing local semantic embedding match...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matching offline runbooks found for query.
            </div>
          ) : (
            results.map(rb => (
              <div
                key={rb.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="mono-val" style={{ color: '#00f0ff', fontSize: '0.85rem' }}>[{rb.id}]</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rb.title}</span>
                  </div>
                  {rb.similarity_score !== undefined && (
                    <span className="mono-val" style={{ color: '#00ff88', fontSize: '0.75rem', background: 'rgba(0,255,136,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      Match: {(rb.similarity_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {/* Symptoms */}
                <div style={{ fontSize: '0.75rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Trigger Symptoms:</span>
                  {rb.trigger_symptoms.map((sym, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '3px', color: '#cbd5e1' }}>
                      {sym}
                    </span>
                  ))}
                </div>

                {/* Triage Steps */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>Operational Triage Steps:</div>
                  <ul style={{ paddingLeft: '16px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {rb.triage_steps.map((st, idx) => (
                      <li key={idx}>{st}</li>
                    ))}
                  </ul>
                </div>

                {/* Remediation */}
                <div style={{ background: 'rgba(0,255,136,0.05)', padding: '8px 10px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(0,255,136,0.15)' }}>
                  <div style={{ fontWeight: 600, color: '#00ff88', marginBottom: '3px' }}>Remediation Strategy:</div>
                  <ul style={{ paddingLeft: '16px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {rb.remediation_actions.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
