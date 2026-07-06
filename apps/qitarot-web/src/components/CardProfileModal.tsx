import { useEffect, useState } from 'react';
import type { CardProfile } from '../types';
import { tarotApi } from '../lib/api';

export function CardProfileModal({
  cardSlug,
  onClose
}: {
  cardSlug: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const data = await tarotApi.getCardProfile(cardSlug);
        setProfile(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load card profile.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [cardSlug]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-profile-modal panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <p className="eyebrow">Card Profile & Analytics</p>
          <button className="close-button" onClick={onClose}>&times;</button>
        </header>

        {loading && <div className="loading-spinner">Calibrating card history...</div>}

        {error && <div className="error-message">{error}</div>}

        {!loading && !error && profile && (
          <div className="profile-grid">
            <div className="profile-image-section">
              <img
                src={profile.card.image_url}
                alt={profile.card.name}
                className="profile-card-image"
              />
              <h3>{profile.card.name}</h3>
              <p className="arcana-badge">{profile.card.arcana} arcana</p>
              {profile.card.suit && <p className="suit-badge">Suit: {profile.card.suit}</p>}
            </div>

            <div className="profile-details-section scroll-container">
              <div className="stats-box grid-2">
                <div className="stat-card">
                  <span>Times pulled</span>
                  <strong>{profile.stats.total_pulls}</strong>
                </div>
                <div className="stat-card">
                  <span>Frequency</span>
                  <strong>{(profile.stats.frequency * 100).toFixed(1)}%</strong>
                </div>
                <div className="stat-card">
                  <span>Upright / Reversed</span>
                  <strong>{profile.stats.upright_count} / {profile.stats.reversed_count}</strong>
                </div>
                <div className="stat-card">
                  <span>Average position</span>
                  <strong>{profile.stats.average_position.toFixed(1)}</strong>
                </div>
              </div>

              <div className="profile-section">
                <h4>Keywords</h4>
                <div className="keywords-split">
                  <div>
                    <h5>Upright</h5>
                    <div className="chips">
                      {profile.card.upright_keywords.map((kw) => (
                        <span className="chip upright" key={kw}>{kw}</span>
                      ))}
                    </div>
                  </div>
                  {profile.card.reversed_keywords.length > 0 && (
                    <div>
                      <h5>Reversed</h5>
                      <div className="chips">
                        {profile.card.reversed_keywords.map((kw) => (
                          <span className="chip reversed" key={kw}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-section">
                <h4>Pulled By</h4>
                {profile.stats.by_person.length === 0 ? (
                  <p className="hint-text">No pulls recorded yet.</p>
                ) : (
                  <ul className="people-counts-list">
                    {profile.stats.by_person.map((person, idx) => (
                      <li key={person.id || person.name} className="person-count-item">
                        <span>{idx + 1}. {person.name}</span>
                        <strong>{person.count} pulls</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="profile-section">
                <h4>Play-by-Play Pull Log</h4>
                {profile.pulls.length === 0 ? (
                  <p className="hint-text">No pulls recorded yet.</p>
                ) : (
                  <div className="pulls-log-list">
                    {profile.pulls.map((pull) => (
                      <div className="pull-log-entry" key={pull.reading_id}>
                        <div className="pull-log-meta">
                          <time>{new Date(pull.created_at).toLocaleDateString()}</time>
                          <span>for <strong>{pull.subject_name}</strong></span>
                        </div>
                        <p className="pull-log-details">
                          Pulled in <strong>{pull.position_label}</strong> position <em>({pull.orientation})</em>
                          {pull.notes && <span className="pull-notes"> - "{pull.notes}"</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
