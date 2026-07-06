import type { Reading } from '../types';

export function Timeline({ readings }: { readings: Reading[] }) {
  const repeatedCards = readings
    .flatMap((reading) => reading.cards.map((card) => card.card_name).filter(Boolean))
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
              <span className="chip" key={card}>{card} × {count}</span>
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
              <h3>{reading.spread_name || 'Reading'} {reading.subject_name ? `for ${reading.subject_name}` : ''}</h3>
              {reading.question && <p><strong>Question:</strong> {reading.question}</p>}
              {reading.summary && <p>{reading.summary}</p>}
              <div className="chips">
                {reading.tags?.map((tag) => <span className="chip" key={tag}>{tag}</span>)}
              </div>
              <ol>
                {reading.cards.map((card) => (
                  <li key={card.id || `${reading.id}-${card.position_key}`}>
                    <strong>{card.position_label}:</strong> {card.card_name || 'Unconfirmed'} <em>({card.orientation})</em>
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
