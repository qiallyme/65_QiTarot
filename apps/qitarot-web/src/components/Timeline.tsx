import type { Reading } from '../types';

export function Timeline({ readings, onSelectCard }: { readings: Reading[]; onSelectCard: (name: string) => void }) {
  const repeatedCards = readings
    .flatMap((reading) => reading.cards.map((card) => card.card?.name || card.card_name).filter(Boolean))
    .reduce<Record<string, number>>((acc, card) => {
      acc[card] = (acc[card] || 0) + 1;
      return acc;
    }, {});

  const repeats = Object.entries(repeatedCards)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section className="panel stack">
      <div className="panel-heading">
        <p className="eyebrow">Step 3</p>
        <h2>Timeline + carryover</h2>
      </div>

      {repeats.length > 0 && (
        <div className="carryover-box">
          <strong>Repeating cards</strong>
          <div className="chips">
            {repeats.map(([card, count]) => (
              <span className="chip clickable" key={card} onClick={() => onSelectCard(card)}>{card} x {count}</span>
            ))}
          </div>
        </div>
      )}

      <div className="timeline">
        {readings.length === 0 ? (
          <p>No readings saved yet.</p>
        ) : (
          readings.map((reading) => (
            <article className="timeline-entry" key={reading.id}>
              <time>{new Date(reading.created_at).toLocaleString()}</time>
              <h3>
                {reading.spread_name || 'Reading'}{' '}
                {reading.person?.display_name || reading.subject_name ? `for ${reading.person?.display_name || reading.subject_name}` : ''}
              </h3>
              {reading.question && <p><strong>Question:</strong> {reading.question}</p>}
              {reading.summary && <p>{reading.summary}</p>}
              <div className="chips">
                {reading.tags?.map((tag) => <span className="chip" key={tag}>{tag}</span>)}
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
                      <em>({card.orientation})</em>
                      {card.meaning_snapshot && <small>{card.meaning_snapshot}</small>}
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
