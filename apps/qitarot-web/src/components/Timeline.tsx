import type { Reading } from '../types';

export function Timeline({
  readings,
  onSelectCard,
  onSelectPerson,
  activeFilter,
  setActiveFilter
}: {
  readings: Reading[];
  onSelectCard: (name: string) => void;
  onSelectPerson: (name: string) => void;
  activeFilter: { type: 'person' | 'tag' | 'suit' | 'arcana' | 'card' | null; value: string | null };
  setActiveFilter: (filter: { type: 'person' | 'tag' | 'suit' | 'arcana' | 'card' | null; value: string | null }) => void;
}) {
  const repeatedCards = readings
    .flatMap((reading) => reading.cards.map((card) => card.card?.name || card.card_name).filter(Boolean))
    .reduce<Record<string, number>>((acc, card) => {
      acc[card] = (acc[card] || 0) + 1;
      return acc;
    }, {});

  const repeats = Object.entries(repeatedCards)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const filtered = readings.filter((reading) => {
    if (!activeFilter.type || !activeFilter.value) return true;
    const val = activeFilter.value.toLowerCase();
    
    if (activeFilter.type === 'person') {
      const pName = (reading.person?.display_name || reading.subject_name || '').toLowerCase();
      return pName === val;
    }
    if (activeFilter.type === 'tag') {
      return reading.tags.map(t => t.toLowerCase()).includes(val);
    }
    if (activeFilter.type === 'card') {
      return reading.cards.some(c => (c.card?.name || c.card_name || '').toLowerCase() === val);
    }
    if (activeFilter.type === 'suit') {
      return reading.cards.some(c => (c.card?.suit || '').toLowerCase() === val);
    }
    if (activeFilter.type === 'arcana') {
      return reading.cards.some(c => (c.card?.arcana || '').toLowerCase() === val);
    }
    return true;
  });

  return (
    <section className="panel stack" id="timeline-section">
      <div className="panel-heading">
        <p className="eyebrow">Step 4</p>
        <h2>Timeline + carryover</h2>
      </div>

      {activeFilter.type && (
        <div className="filter-banner">
          <span>
            Filter active: <span className="filter-type">{activeFilter.type}</span> = <strong>{activeFilter.value}</strong>
          </span>
          <button className="clear-filter-btn button-link" onClick={() => setActiveFilter({ type: null, value: null })}>
            Clear Filter
          </button>
        </div>
      )}

      {repeats.length > 0 && !activeFilter.type && (
        <div className="carryover-box">
          <strong>Repeating cards (carryover)</strong>
          <div className="chips">
            {repeats.map(([card, count]) => (
              <span className="chip clickable" key={card} onClick={() => onSelectCard(card)}>{card} x {count}</span>
            ))}
          </div>
        </div>
      )}

      <div className="timeline">
        {filtered.length === 0 ? (
          <p className="hint-text">No readings match this filter.</p>
        ) : (
          filtered.map((reading) => (
            <article className="timeline-entry" key={reading.id}>
              <div className="timeline-meta">
                <time>{new Date(reading.created_at).toLocaleString()}</time>
                {reading.ai_status && (
                  <span className={`ai-status-badge ${reading.ai_status}`}>
                    AI {reading.ai_status}
                  </span>
                )}
              </div>
              <h3>
                {reading.spread_name || 'Reading'}{' '}
                {(reading.person?.display_name || reading.subject_name) && (
                  <>
                    for{' '}
                    <span
                      className="person-link clickable-text"
                      onClick={() => setActiveFilter({ type: 'person', value: reading.person?.display_name || reading.subject_name || null })}
                    >
                      {reading.person?.display_name || reading.subject_name}
                    </span>
                  </>
                )}
              </h3>
              {reading.question && <p><strong>Question:</strong> {reading.question}</p>}
              {reading.summary && <p>{reading.summary}</p>}
              {reading.interpretation && (
                <details className="interpretation-details">
                  <summary>View Interpretation</summary>
                  <p className="interpretation-text">{reading.interpretation}</p>
                </details>
              )}
              <div className="chips">
                {reading.tags?.map((tag) => (
                  <span
                    className="chip clickable"
                    key={tag}
                    onClick={() => setActiveFilter({ type: 'tag', value: tag })}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ol className="timeline-cards">
                {reading.cards.map((card) => (
                  <li className="timeline-card" key={card.id || `${reading.id}-${card.position_key}`}>
                    {(card.card?.image_url || card.card_image_url) && (
                      <img src={card.card?.image_url || card.card_image_url} alt={card.card?.name || card.card_name} loading="lazy" />
                    )}
                    <span>
                      <strong>{card.position_label}:</strong>{' '}
                      <span className="timeline-card-name clickable" onClick={() => onSelectCard(card.card?.name || card.card_name)}>
                        {card.card?.name || card.card_name || 'Unconfirmed'}
                      </span>{' '}
                      <em className="orientation-text">({card.orientation})</em>
                      {card.meaning_snapshot && <small className="meaning-snippet">{card.meaning_snapshot}</small>}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
