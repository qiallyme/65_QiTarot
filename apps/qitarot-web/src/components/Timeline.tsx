import { useState, useMemo } from 'react';
import type { Reading } from '../types';

function groupReadingsByDate(readings: Reading[]) {
  const today: Reading[] = [];
  const thisWeek: Reading[] = [];
  const thisMonth: Reading[] = [];
  const older: Reading[] = [];
  const now = new Date();

  readings.forEach((reading) => {
    const d = new Date(reading.created_at);
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      today.push(reading);
    } else if (diffDays <= 7) {
      thisWeek.push(reading);
    } else if (diffDays <= 30) {
      thisMonth.push(reading);
    } else {
      older.push(reading);
    }
  });

  return [
    { title: 'Today', items: today },
    { title: 'This Week', items: thisWeek },
    { title: 'This Month', items: thisMonth },
    { title: 'Older', items: older }
  ].filter((group) => group.items.length > 0);
}

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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
      return reading.tags.map((t) => t.toLowerCase()).includes(val);
    }
    if (activeFilter.type === 'card') {
      return reading.cards.some((c) => (c.card?.name || c.card_name || '').toLowerCase() === val);
    }
    if (activeFilter.type === 'suit') {
      return reading.cards.some((c) => (c.card?.suit || '').toLowerCase() === val);
    }
    if (activeFilter.type === 'arcana') {
      return reading.cards.some((c) => (c.card?.arcana || '').toLowerCase() === val);
    }
    return true;
  });

  const grouped = useMemo(() => groupReadingsByDate(filtered), [filtered]);

  return (
    <section className="panel stack" id="timeline-section">
      <div className="panel-heading">
        <p className="eyebrow">Journal Logs</p>
        <h2>Reading Timeline</h2>
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
              <span className="chip clickable" key={card} onClick={() => onSelectCard(card)}>
                {card} x {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="timeline-groups">
        {grouped.length === 0 ? (
          <p className="hint-text">No readings found.</p>
        ) : (
          grouped.map((group) => (
            <div className="timeline-group-container" key={group.title}>
              <h4 className="timeline-group-title">{group.title}</h4>
              <div className="timeline">
                {group.items.map((reading) => {
                  const isExpanded = expandedIds[reading.id] || false;
                  return (
                    <article className={`timeline-entry collapsible-entry ${isExpanded ? 'expanded' : 'collapsed'}`} key={reading.id}>
                      <div className="timeline-meta" onClick={() => toggleExpand(reading.id)} style={{ cursor: 'pointer' }}>
                        <time>{new Date(reading.created_at).toLocaleString()}</time>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {reading.rating && (
                            <span className="rating-display">
                              {'★'.repeat(reading.rating)}{'☆'.repeat(5 - reading.rating)}
                            </span>
                          )}
                          {reading.ai_status && (
                            <span className={`ai-status-badge ${reading.ai_status}`}>
                              AI {reading.ai_status}
                            </span>
                          )}
                          <span className="collapse-toggle-arrow">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      <h3 onClick={() => toggleExpand(reading.id)} style={{ cursor: 'pointer' }}>
                        {reading.spread_name || 'Reading'}{' '}
                        {(reading.person?.display_name || reading.subject_name) && (
                          <>
                            for <span className="person-highlight">{reading.person?.display_name || reading.subject_name}</span>
                          </>
                        )}
                      </h3>
                      {reading.question && (
                        <p className="timeline-question">
                          <strong>Question:</strong> {reading.question}
                        </p>
                      )}
                      {reading.summary && (
                        <p className="timeline-summary">
                          <strong>Summary:</strong> {reading.summary}
                        </p>
                      )}

                      {isExpanded && (
                        <div className="expanded-details-area">
                          {reading.interpretation && (
                            <div className="interpretation-section">
                              <h4>Detailed Interpretation</h4>
                              <p className="interpretation-text">{reading.interpretation}</p>
                            </div>
                          )}

                          <div className="chips">
                            {reading.tags?.map((tag) => (
                              <span
                                className="chip clickable"
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFilter({ type: 'tag', value: tag });
                                }}
                              >
                                #{tag}
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
                                  <span
                                    className="timeline-card-name clickable"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectCard(card.card?.name || card.card_name);
                                    }}
                                  >
                                    {card.card?.name || card.card_name || 'Unconfirmed'}
                                  </span>{' '}
                                  <em className="orientation-text">({card.orientation})</em>
                                  {card.meaning_snapshot && <small className="meaning-snippet">{card.meaning_snapshot}</small>}
                                  {card.notes && <small className="notes-snippet">Reader notes: {card.notes}</small>}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
