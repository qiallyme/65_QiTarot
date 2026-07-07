import { SpreadDiagram } from './SpreadDiagram';
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
    <section className="panel stack">
      <div className="panel-heading">
        <p className="eyebrow">Step 1</p>
        <h2>Select Spread</h2>
      </div>
      <div className="spread-carousel-wrap">
        <div className="spread-carousel-track">
          {spreads.map((spread) => (
            <div
              className={`spread-carousel-card ${selectedId === spread.id ? 'selected' : ''}`}
              key={spread.id}
              onClick={() => onSelect(spread)}
            >
              <div className="card-top">
                <span className="card-badge">{spread.card_count} Cards</span>
                <h3>{spread.name}</h3>
                <p className="card-desc">{spread.description}</p>
              </div>
              <div className="card-diagram-preview">
                <SpreadDiagram spread={spread} />
              </div>
              <button type="button" className="primary select-spread-btn">
                Choose Spread
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
