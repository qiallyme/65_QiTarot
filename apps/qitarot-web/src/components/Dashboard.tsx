import type { AnalyticsSummary } from '../types';

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
        <p>No signal yet.</p>
      ) : (
        rows.map((row) => (
          <div
            className={`bar-row ${onClickRow ? 'clickable-row' : ''}`}
            key={row.label}
            onClick={() => onClickRow?.(row.label)}
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
  onSelectGroup
}: {
  analytics?: AnalyticsSummary;
  onSelectCard: (name: string) => void;
  onSelectPerson: (name: string) => void;
  onSelectGroup: (type: 'suit' | 'arcana', value: string) => void;
}) {
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
      'Wands': 'wands',
      'Cups': 'cups',
      'Swords': 'swords',
      'Pentacles': 'pentacles'
    };
    onSelectGroup('suit', mapping[label] || label.toLowerCase());
  };

  const handleArcanaClick = (label: string) => {
    onSelectGroup('arcana', label.includes('Major') ? 'major' : 'minor');
  };

  return (
    <section className="dashboard">
      <div className="metric-card clickable-metric" onClick={() => onSelectGroup('arcana', 'major')}>
        <span>Readings</span>
        <strong>{analytics?.total_readings ?? 0}</strong>
      </div>
      <div className="metric-card clickable-metric">
        <span>People</span>
        <strong>{analytics?.unique_people ?? 0}</strong>
      </div>
      <div className="metric-card clickable-metric">
        <span>Cards logged</span>
        <strong>{analytics?.total_cards ?? 0}</strong>
      </div>
      
      <div className="metric-card wide-card">
        <span>Most frequent cards</span>
        <div className="chips">
          {(analytics?.top_cards || []).slice(0, 5).map((card) => (
            <span className="chip clickable" key={card.name} onClick={() => onSelectCard(card.name)}>
              {card.name} x {card.count}
            </span>
          ))}
          {!analytics?.top_cards?.length && <span className="chip">No repeats yet</span>}
        </div>
      </div>

      <div className="metric-card wide-card">
        <span>Most active people</span>
        <div className="chips">
          {(analytics?.top_people || []).slice(0, 5).map((person) => (
            <span className="chip clickable" key={person.name} onClick={() => onSelectPerson(person.name)}>
              {person.name} x {person.count}
            </span>
          ))}
          {!analytics?.top_people?.length && <span className="chip">No history yet</span>}
        </div>
      </div>

      <div className="metric-card chart-card">
        <span>Suits</span>
        <BarList rows={suitRows} onClickRow={handleSuitClick} />
      </div>
      <div className="metric-card chart-card">
        <span>Arcana</span>
        <BarList rows={arcanaRows} onClickRow={handleArcanaClick} />
      </div>
    </section>
  );
}
