import { useState } from 'react';
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
  const initialIndex = spreads.findIndex(s => s.id === selectedId);
  const [activeIndex, setActiveIndex] = useState(initialIndex !== -1 ? initialIndex : 0);

  const activeSpread = spreads[activeIndex] || spreads[0];

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < spreads.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  if (!activeSpread) {
    return <p className="hint-text">No spreads templates available.</p>;
  }

  return (
    <section className="panel stack select-spread-deck-section">
      <div className="panel-heading centered-heading">
        <p className="eyebrow">Step 1</p>
        <h2>Select Spread Template</h2>
      </div>

      <div className="swipe-deck-container">
        {/* Previous Card visual preview background */}
        {activeIndex > 0 && (
          <div className="deck-card-preview prev-preview" onClick={handlePrev}>
            <span>{spreads[activeIndex - 1].name}</span>
          </div>
        )}

        {/* Active Main Card */}
        <div className="swipe-deck-card active-card">
          <div className="card-top">
            <span className="card-badge">{activeSpread.card_count} Cards</span>
            <h3>{activeSpread.name}</h3>
            <p className="card-desc">{activeSpread.description}</p>
          </div>
          <div className="card-diagram-preview">
            <SpreadDiagram spread={activeSpread} layoutType="flex" />
          </div>
        </div>

        {/* Next Card visual preview background */}
        {activeIndex < spreads.length - 1 && (
          <div className="deck-card-preview next-preview" onClick={handleNext}>
            <span>{spreads[activeIndex + 1].name}</span>
          </div>
        )}
      </div>

      {/* Swipe Deck Actions Controls */}
      <div className="swipe-deck-controls">
        <button
          type="button"
          className="secondary prev-btn"
          disabled={activeIndex === 0}
          onClick={handlePrev}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="primary select-btn"
          onClick={() => onSelect(activeSpread)}
        >
          Select Spread
        </button>
        <button
          type="button"
          className="secondary next-btn"
          disabled={activeIndex === spreads.length - 1}
          onClick={handleNext}
        >
          Next →
        </button>
      </div>

      {/* Pagination dots indicator */}
      <div className="deck-dots-indicator">
        {spreads.map((_, idx) => (
          <span
            key={idx}
            className={`deck-dot ${idx === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(idx)}
          />
        ))}
      </div>
    </section>
  );
}
