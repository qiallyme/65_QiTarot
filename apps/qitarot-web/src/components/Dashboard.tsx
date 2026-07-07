import { useState } from 'react';
import type { AnalyticsSummary } from '../types';
import { tarotApi } from '../lib/api';

const suitLabels: Record<string, string> = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pentacles'
};

function BarList({
  rows,
  onClickRow
}: {
  rows: Array<{ label: string; value: number }>;
  onClickRow?: (label: string) => void;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="bar-list">
      {rows.length === 0 ? (
        <p className="hint-text">No signals recorded.</p>
      ) : (
        rows.map((row) => (
          <div
            className={`bar-row ${onClickRow ? 'clickable-row' : ''}`}
            key={row.label}
            onClick={() => onClickRow?.(row.label)}
            style={{ cursor: onClickRow ? 'pointer' : 'default' }}
          >
            <span>{row.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
            <strong>{row.value}</strong>
          </div>
        ))
      )}
    </div>
  );
}

export function Dashboard({
  analytics,
  onSelectCard,
  onSelectPerson,
  onSelectGroup,
  onNavigateTab
}: {
  analytics?: AnalyticsSummary;
  onSelectCard: (name: string) => void;
  onSelectPerson: (name: string) => void;
  onSelectGroup: (type: 'suit' | 'arcana' | 'tag' | null, value: string | null) => void;
  onNavigateTab: (tab: 'draw' | 'signals' | 'history' | 'system') => void;
}) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hello! I am your Tarot memory engine. Ask me about patterns, recurring cards, or theme carryovers in your readings history.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const suitRows = Object.entries(analytics?.suit_counts || {}).map(([label, value]) => ({
    label: suitLabels[label] || label,
    value
  }));

  const arcanaRows = Object.entries(analytics?.arcana_counts || {}).map(([label, value]) => ({
    label: label === 'major' ? 'Major Arcana' : 'Minor Arcana',
    value
  }));

  const handleSuitClick = (label: string) => {
    const mapping: Record<string, string> = {
      Wands: 'wands',
      Cups: 'cups',
      Swords: 'swords',
      Pentacles: 'pentacles'
    };
    onSelectGroup('suit', mapping[label] || label.toLowerCase());
  };

  const handleArcanaClick = (label: string) => {
    onSelectGroup('arcana', label.includes('Major') ? 'major' : 'minor');
  };

  const handleSendChat = async (messageText: string) => {
    const query = messageText.trim();
    if (!query || chatLoading) return;

    setChatMessage('');
    setChatLog((prev) => [...prev, { role: 'user', text: query }]);
    setChatLoading(true);

    try {
      const response = await tarotApi.chatHistory(query);
      setChatLog((prev) => [...prev, { role: 'assistant', text: response.answer }]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error contacting history analysis agent. Make sure connection is active.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const presets = [
    'What patterns do you see in my readings?',
    'What card keeps showing up most?',
    'What themes are repeating?',
    'What does my overall tarot history suggest?'
  ];

  return (
    <section className="dashboard-container stack">
      <div className="dashboard-metrics-grid">
        <div
          className="metric-card mini-card clickable"
          onClick={() => {
            onSelectGroup(null, null);
            onNavigateTab('history');
          }}
        >
          <span>Readings</span>
          <strong>{analytics?.total_readings ?? 0}</strong>
        </div>
        <div
          className="metric-card mini-card clickable"
          onClick={() => {
            onSelectGroup(null, null);
            onNavigateTab('history');
          }}
        >
          <span>People Logs</span>
          <strong>{analytics?.unique_people ?? 0}</strong>
        </div>
        <div
          className="metric-card mini-card clickable"
          onClick={() => {
            onSelectGroup(null, null);
            onNavigateTab('history');
          }}
        >
          <span>Cards Pulled</span>
          <strong>{analytics?.total_cards ?? 0}</strong>
        </div>
      </div>

      <div className="dashboard">
        <div className="metric-card wide-card">
          <span>Most frequent cards</span>
          <div className="chips">
            {(analytics?.top_cards || []).slice(0, 6).map((card) => (
              <span className="chip clickable" key={card.name} onClick={() => onSelectCard(card.name)}>
                {card.name} ({card.count})
              </span>
            ))}
            {!analytics?.top_cards?.length && <span className="chip">No repeat cards logged yet.</span>}
          </div>
        </div>

        <div className="metric-card wide-card">
          <span>Most active people</span>
          <div className="chips">
            {(analytics?.top_people || []).slice(0, 6).map((person) => (
              <span className="chip clickable" key={person.name} onClick={() => onSelectPerson(person.name)}>
                {person.name} ({person.count})
              </span>
            ))}
            {!analytics?.top_people?.length && <span className="chip">No subject logs recorded yet.</span>}
          </div>
        </div>

        <div className="metric-card chart-card">
          <span>Suits Signals</span>
          <BarList rows={suitRows} onClickRow={handleSuitClick} />
        </div>

        <div className="metric-card chart-card">
          <span>Arcana Balance</span>
          <BarList rows={arcanaRows} onClickRow={handleArcanaClick} />
        </div>
      </div>

      {/* AI Chatbot History Engine Panel */}
      <div className="panel chatbot-history-panel stack">
        <div className="panel-heading">
          <p className="eyebrow">oracle query</p>
          <h3>AI Chat History Analyst</h3>
        </div>
        <p className="hint-text" style={{ marginTop: '-8px' }}>
          Interrogate your logged draws. The AI will audit your journal and look for trends, correspondences, and repeating symbols.
        </p>

        <div className="chat-log-box">
          {chatLog.map((log, idx) => (
            <div key={idx} className={`chat-message ${log.role}`}>
              <div className="message-header">{log.role === 'assistant' ? '🔮 Oracle Analyst' : '👤 You'}</div>
              <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
                {log.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="chat-message assistant typing">
              <div className="message-header">🔮 Oracle Analyst</div>
              <div className="message-content">Consulting database entries...</div>
            </div>
          )}
        </div>

        <div className="chat-presets-list">
          {presets.map((preset) => (
            <button
              type="button"
              className="preset-chip-btn"
              key={preset}
              disabled={chatLoading}
              onClick={() => handleSendChat(preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="chat-input-bar">
          <input
            type="text"
            placeholder="Ask about recurring themes, specific cards, etc..."
            value={chatMessage}
            disabled={chatLoading}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendChat(chatMessage);
              }
            }}
          />
          <button
            type="button"
            className="primary send-chat-btn"
            disabled={chatLoading || !chatMessage.trim()}
            onClick={() => handleSendChat(chatMessage)}
          >
            Ask AI
          </button>
        </div>
      </div>
    </section>
  );
}
