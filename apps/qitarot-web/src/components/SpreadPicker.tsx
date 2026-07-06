import type { SpreadTemplate } from '../types';

export function SpreadPicker({
  spreads,
  selectedId,
  onSelect
}: {
  spreads: SpreadTemplate[];
  selectedId?: string;
  onSelect: (spread: SpreadTemplate) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Step 1</p>
        <h2>Pick the spread</h2>
      </div>
      <div className="spread-grid">
        {spreads.map((spread) => (
          <button
            type="button"
            className={`spread-card ${selectedId === spread.id ? 'selected' : ''}`}
            key={spread.id}
            onClick={() => onSelect(spread)}
          >
            <span>{spread.card_count} cards</span>
            <strong>{spread.name}</strong>
            <p>{spread.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
