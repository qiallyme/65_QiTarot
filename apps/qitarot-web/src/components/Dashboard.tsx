import type { AnalyticsSummary } from '../types';

const suitLabels: Record<string, string> = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pentacles'
};

function BarList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="bar-list">
      {rows.length === 0 ? (
        <p>No signal yet.</p>
      ) : (
        rows.map((row) => (
          <div className="bar-row" key={row.label}>
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

export function Dashboard({ analytics }: { analytics?: AnalyticsSummary }) {
  const suitRows = Object.entries(analytics?.suit_counts || {}).map(([label, value]) => ({
    label: suitLabels[label] || label,
    value
  }));

  const arcanaRows = Object.entries(analytics?.arcana_counts || {}).map(([label, value]) => ({
    label: label === 'major' ? 'Major Arcana' : 'Minor Arcana',
    value
  }));

  return (
    <section className="dashboard">
      <div className="metric-card">
        <span>Readings</span>
        <strong>{analytics?.total_readings ?? 0}</strong>
      </div>
      <div className="metric-card">
        <span>People</span>
        <strong>{analytics?.unique_people ?? 0}</strong>
      </div>
      <div className="metric-card">
        <span>Cards logged</span>
        <strong>{analytics?.total_cards ?? 0}</strong>
      </div>
      <div className="metric-card wide-card">
        <span>Most frequent cards</span>
        <div className="chips">
          {(analytics?.top_cards || []).slice(0, 5).map((card) => (
            <span className="chip" key={card.name}>
              {card.name} x {card.count}
            </span>
          ))}
          {!analytics?.top_cards?.length && <span className="chip">No repeats yet</span>}
        </div>
      </div>
      <div className="metric-card chart-card">
        <span>Suits</span>
        <BarList rows={suitRows} />
      </div>
      <div className="metric-card chart-card">
        <span>Arcana</span>
        <BarList rows={arcanaRows} />
      </div>
    </section>
  );
}
