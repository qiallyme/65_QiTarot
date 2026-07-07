import { useEffect, useMemo, useState } from 'react';
import { ReadingEditor } from './components/ReadingEditor';
import { Timeline } from './components/Timeline';
import { Dashboard } from './components/Dashboard';
import { CardProfileModal } from './components/CardProfileModal';
import { FALLBACK_CARDS } from './data/cardCatalog';
import { FALLBACK_SPREADS } from './data/localSpreads';
import { tarotApi } from './lib/api';
import type { AnalyticsSummary, Person, Reading, SpreadTemplate, TarotCard } from './types';

export function App() {
  const [spreads, setSpreads] = useState<SpreadTemplate[]>(FALLBACK_SPREADS);
  const [cardCatalog, setCardCatalog] = useState<TarotCard[]>(FALLBACK_CARDS);
  const [people, setPeople] = useState<Person[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'fallback'>('checking');
  const [notice, setNotice] = useState('');
  const [activeCardSlug, setActiveCardSlug] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{
    type: 'person' | 'tag' | 'suit' | 'arcana' | 'card' | null;
    value: string | null;
  }>({ type: null, value: null });
  const [activeTab, setActiveTab] = useState<'draw' | 'signals' | 'history' | 'system'>('draw');

  // Identity Profile Defaults
  const [defaultReaderName, setDefaultReaderName] = useState(() => localStorage.getItem('qitarot_reader_name') || 'Reader');
  const [defaultSelfLabel, setDefaultSelfLabel] = useState(() => localStorage.getItem('qitarot_self_label') || 'Myself');

  // Advanced Configurations Local States
  const [activeSettingsSection, setActiveSettingsSection] = useState<'profile' | 'spreads' | 'cards' | 'deck' | 'ai'>('profile');
  
  // Custom spreads state
  const [customSpreadsList, setCustomSpreadsList] = useState<SpreadTemplate[]>([]);
  const [editingSpread, setEditingSpread] = useState<Partial<SpreadTemplate> | null>(null);

  // Custom cards override state
  const [searchCardKeyword, setSearchCardKeyword] = useState('');
  const [editingCardOverride, setEditingCardOverride] = useState<TarotCard | null>(null);

  // Custom deck overrides
  const [customCardBackUrl, setCustomCardBackUrl] = useState(() => localStorage.getItem('qitarot_custom_card_back') || '');

  // Custom AI preferences
  const [aiModelPreference, setAiModelPreference] = useState(() => localStorage.getItem('qitarot_ai_model') || 'gpt-4o-mini');
  const [aiStylePreference, setAiStylePreference] = useState(() => localStorage.getItem('qitarot_ai_style') || 'mystical');

  useEffect(() => {
    async function load() {
      try {
        await tarotApi.health();
        setApiStatus('online');

        try {
          const apiSpreads = await tarotApi.listSpreads();
          if (apiSpreads.length) setSpreads(apiSpreads);
        } catch (e) {
          console.warn('Failed to load spreads template:', e);
        }

        try {
          const apiCards = await tarotApi.listCards();
          if (apiCards.length) setCardCatalog(apiCards);
        } catch (e) {
          console.warn('Failed to load card catalog:', e);
        }

        try {
          const apiPeople = await tarotApi.listPeople();
          setPeople(apiPeople);
        } catch (e) {
          console.warn('Failed to load people:', e);
        }

        try {
          const apiAnalytics = await tarotApi.getAnalytics();
          setAnalytics(apiAnalytics);
        } catch (e) {
          console.warn('Failed to load analytics:', e);
        }

        try {
          const apiReadings = await tarotApi.listReadings({ limit: 50 });
          setReadings(apiReadings);
        } catch (e) {
          console.warn('Failed to load readings:', e);
        }
      } catch (error) {
        console.warn('Tarot health check failed:', error);
        setApiStatus('fallback');
        setNotice('QiTarot API is offline. Local database rules applied.');
      }
    }
    load();
  }, []);

  // Merge local overrides on mount
  useEffect(() => {
    const localSpreads = localStorage.getItem('qitarot_custom_spreads');
    if (localSpreads) {
      try {
        const parsed = JSON.parse(localSpreads) as SpreadTemplate[];
        setCustomSpreadsList(parsed);
        setSpreads((prev) => [...prev.filter(s => !parsed.some(p => p.id === s.id)), ...parsed]);
      } catch (e) {}
    }

    const localCards = localStorage.getItem('qitarot_custom_cards');
    if (localCards) {
      try {
        const parsed = JSON.parse(localCards);
        setCardCatalog((prev) =>
          prev.map((c) => (parsed[c.id] ? { ...c, ...parsed[c.id] } : c))
        );
      } catch (e) {}
    }
  }, []);

  function playChime() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.0);
    } catch (e) {
      console.warn('Audio check blocked:', e);
    }
  }

  function handleSelectCardByName(name: string) {
    if (!name || name === 'Unconfirmed') return;
    const card = cardCatalog.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (card) {
      setActiveCardSlug(card.slug);
    } else {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setActiveCardSlug(slug);
    }
  }

  const handleSaveCustomSpread = () => {
    if (!editingSpread?.name || !editingSpread.card_count) return;
    const newId = editingSpread.id || `local-${Date.now()}`;
    const customSpread: SpreadTemplate = {
      id: newId,
      slug: editingSpread.slug || newId,
      name: editingSpread.name,
      description: editingSpread.description || '',
      card_count: Number(editingSpread.card_count),
      positions: editingSpread.positions || Array.from({ length: editingSpread.card_count }).map((_, i) => ({
        key: `pos-${i + 1}`,
        label: `Position ${i + 1}`,
        prompt: `Focus insight ${i + 1}`,
        order: i + 1,
        x: 10 + i * 20,
        y: 50
      }))
    };

    const nextList = [...customSpreadsList.filter(s => s.id !== newId), customSpread];
    setCustomSpreadsList(nextList);
    localStorage.setItem('qitarot_custom_spreads', JSON.stringify(nextList));
    setSpreads(prev => [...prev.filter(s => s.id !== newId), customSpread]);
    setEditingSpread(null);
    playChime();
  };

  const handleSaveCardOverride = () => {
    if (!editingCardOverride) return;
    const localCards = localStorage.getItem('qitarot_custom_cards');
    const currentOverrides = localCards ? JSON.parse(localCards) : {};
    
    currentOverrides[editingCardOverride.id] = {
      upright_keywords: editingCardOverride.upright_keywords,
      reversed_keywords: editingCardOverride.reversed_keywords,
      meaning_upright: editingCardOverride.meaning_upright,
      meaning_reversed: editingCardOverride.meaning_reversed
    };

    localStorage.setItem('qitarot_custom_cards', JSON.stringify(currentOverrides));
    setCardCatalog(prev => prev.map(c => c.id === editingCardOverride.id ? editingCardOverride : c));
    setEditingCardOverride(null);
    playChime();
  };

  const handleCompleteReading = (reading: Reading) => {
    playChime();
    setReadings((prev) => {
      const idx = prev.findIndex(r => r.id === reading.id);
      if (idx !== -1) {
        return prev.map(r => r.id === reading.id ? reading : r);
      }
      return [reading, ...prev];
    });

    // Refresh lists
    Promise.all([
      tarotApi.listPeople(),
      tarotApi.getAnalytics()
    ]).then(([nextPeople, nextAnalytics]) => {
      setPeople(nextPeople);
      setAnalytics(nextAnalytics);
    });
  };

  return (
    <main className="mobile-viewport">
      <header className="hero text-center">
        <div className="hero-top">
          <h1>QiTarot</h1>
          <div className={`status-dot ${apiStatus}`} title={`API is ${apiStatus}`} />
        </div>
        <p className="subtitle">
          Guided mobile tarot workspace & analyzer.
        </p>

        {notice && <div className="notice">{notice}</div>}

        {/* Desktop Navigation Top Bar Tabs */}
        <nav className="desktop-navbar">
          <button type="button" className={activeTab === 'draw' ? 'active' : ''} onClick={() => setActiveTab('draw')}>🔮 Draw</button>
          <button type="button" className={activeTab === 'signals' ? 'active' : ''} onClick={() => setActiveTab('signals')}>📊 Signals</button>
          <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>📜 History</button>
          <button type="button" className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>⚙️ System</button>
        </nav>
      </header>

      {/* Conditional Rendering of tab views */}
      {activeTab === 'draw' && (
        <div className="tab-view-draw">
          <ReadingEditor
            spreads={spreads}
            cardCatalog={cardCatalog}
            people={people}
            onCompleteReading={handleCompleteReading}
            onNavigateTab={setActiveTab}
          />
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="tab-view-signals">
          <Dashboard
            analytics={analytics}
            onSelectCard={handleSelectCardByName}
            onSelectPerson={(name) => {
              setActiveFilter({ type: 'person', value: name });
              setActiveTab('history');
            }}
            onSelectGroup={(type, value) => {
              setActiveFilter({ type, value });
              setActiveTab('history');
            }}
            onNavigateTab={setActiveTab}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="tab-view-history">
          <Timeline
            readings={readings}
            onSelectCard={handleSelectCardByName}
            onSelectPerson={(name) => setActiveFilter({ type: 'person', value: name })}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        </div>
      )}

      {activeTab === 'system' && (
        <div className="tab-view-system panel stack">
          <h2>System & Profile Settings</h2>

          {/* Advanced Configurations Tab Bar */}
          <div className="segmented settings-tabs">
            <button type="button" className={activeSettingsSection === 'profile' ? 'active' : ''} onClick={() => setActiveSettingsSection('profile')}>Identity</button>
            <button type="button" className={activeSettingsSection === 'spreads' ? 'active' : ''} onClick={() => setActiveSettingsSection('spreads')}>Spreads</button>
            <button type="button" className={activeSettingsSection === 'cards' ? 'active' : ''} onClick={() => setActiveSettingsSection('cards')}>Cards</button>
            <button type="button" className={activeSettingsSection === 'deck' ? 'active' : ''} onClick={() => setActiveSettingsSection('deck')}>Deck Art</button>
            <button type="button" className={activeSettingsSection === 'ai' ? 'active' : ''} onClick={() => setActiveSettingsSection('ai')}>AI Options</button>
          </div>

          <hr style={{ border: 'none', borderBottom: '1px solid var(--line)', margin: '12px 0' }} />

          {/* Tab Content Section 1: Profile defaults */}
          {activeSettingsSection === 'profile' && (
            <div className="stack" style={{ gap: '12px' }}>
              <h3>Profile Defaults</h3>
              <div className="form-group" style={{ display: 'grid', gap: '6px' }}>
                <label>Default Reader Display Name</label>
                <input
                  type="text"
                  value={defaultReaderName}
                  onChange={(e) => {
                    setDefaultReaderName(e.target.value);
                    localStorage.setItem('qitarot_reader_name', e.target.value);
                  }}
                  placeholder="e.g. Reader"
                />
              </div>
              <div className="form-group" style={{ display: 'grid', gap: '6px' }}>
                <label>Default Self/Subject Label</label>
                <input
                  type="text"
                  value={defaultSelfLabel}
                  onChange={(e) => {
                    setDefaultSelfLabel(e.target.value);
                    localStorage.setItem('qitarot_self_label', e.target.value);
                  }}
                  placeholder="e.g. Myself"
                />
              </div>
            </div>
          )}

          {/* Tab Content Section 2: Spread templates customizer */}
          {activeSettingsSection === 'spreads' && (
            <div className="stack" style={{ gap: '12px' }}>
              <h3>Custom Spread Templates</h3>
              
              {editingSpread ? (
                <div className="panel stack" style={{ borderStyle: 'solid', borderColor: 'var(--accent)' }}>
                  <h4>{editingSpread.id ? 'Edit Spread' : 'Add Custom Spread'}</h4>
                  <label>
                    Spread Name *
                    <input
                      type="text"
                      value={editingSpread.name || ''}
                      onChange={(e) => setEditingSpread(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Past, Present, Future"
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={editingSpread.description || ''}
                      onChange={(e) => setEditingSpread(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="A short guidance on layout"
                    />
                  </label>
                  <label>
                    Card Count *
                    <input
                      type="number"
                      value={editingSpread.card_count || ''}
                      onChange={(e) => setEditingSpread(prev => ({ ...prev, card_count: Number(e.target.value) }))}
                      placeholder="e.g. 3"
                    />
                  </label>
                  <div className="step-actions">
                    <button type="button" className="secondary" onClick={() => setEditingSpread(null)}>Cancel</button>
                    <button type="button" className="primary" onClick={handleSaveCustomSpread}>Save Template</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="chips">
                    {spreads.map((s) => (
                      <span className="chip" key={s.id}>
                        {s.name} ({s.card_count} cards)
                        {s.id.startsWith('local-') && (
                          <button
                            type="button"
                            className="remove-chip-btn"
                            onClick={() => {
                              const list = customSpreadsList.filter(cs => cs.id !== s.id);
                              setCustomSpreadsList(list);
                              localStorage.setItem('qitarot_custom_spreads', JSON.stringify(list));
                              setSpreads(prev => prev.filter(ps => ps.id !== s.id));
                            }}
                          >✕</button>
                        )}
                      </span>
                    ))}
                  </div>
                  <button type="button" className="secondary" onClick={() => setEditingSpread({ positions: [] })}>
                    + Create Custom Spread
                  </button>
                </>
              )}
            </div>
          )}

          {/* Tab Content Section 3: Card metadata customization */}
          {activeSettingsSection === 'cards' && (
            <div className="stack" style={{ gap: '12px' }}>
              <h3>Tarot Card Keywords Editor</h3>
              
              {editingCardOverride ? (
                <div className="panel stack" style={{ borderStyle: 'solid', borderColor: 'var(--accent)' }}>
                  <h4>Edit Card: {editingCardOverride.name}</h4>
                  <label>
                    Upright Keywords (separated by comma)
                    <input
                      type="text"
                      value={editingCardOverride.upright_keywords.join(', ')}
                      onChange={(e) => {
                        const kws = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                        setEditingCardOverride(prev => prev ? { ...prev, upright_keywords: kws } : null);
                      }}
                    />
                  </label>
                  <label>
                    Reversed Keywords
                    <input
                      type="text"
                      value={editingCardOverride.reversed_keywords.join(', ')}
                      onChange={(e) => {
                        const kws = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                        setEditingCardOverride(prev => prev ? { ...prev, reversed_keywords: kws } : null);
                      }}
                    />
                  </label>
                  <label>
                    Upright Meaning Description
                    <textarea
                      value={editingCardOverride.meaning_upright}
                      onChange={(e) => {
                        const text = e.target.value;
                        setEditingCardOverride(prev => prev ? { ...prev, meaning_upright: text } : null);
                      }}
                    />
                  </label>
                  <label>
                    Reversed Meaning Description
                    <textarea
                      value={editingCardOverride.meaning_reversed}
                      onChange={(e) => {
                        const text = e.target.value;
                        setEditingCardOverride(prev => prev ? { ...prev, meaning_reversed: text } : null);
                      }}
                    />
                  </label>
                  <div className="step-actions">
                    <button type="button" className="secondary" onClick={() => setEditingCardOverride(null)}>Cancel</button>
                    <button type="button" className="primary" onClick={handleSaveCardOverride}>Save Card Overrides</button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search cards catalog to edit keywords..."
                    value={searchCardKeyword}
                    onChange={(e) => setSearchCardKeyword(e.target.value)}
                  />
                  <div className="inline-card-results" style={{ position: 'static', maxHeight: '250px', overflowY: 'auto' }}>
                    {cardCatalog
                      .filter(c => c.name.toLowerCase().includes(searchCardKeyword.toLowerCase()))
                      .slice(0, 10)
                      .map((card) => (
                        <button
                          type="button"
                          className="inline-result-btn"
                          key={card.id}
                          onClick={() => setEditingCardOverride(card)}
                        >
                          {card.name} (Edit Keywords)
                        </button>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab Content Section 4: Custom deck backend overrides */}
          {activeSettingsSection === 'deck' && (
            <div className="stack" style={{ gap: '12px' }}>
              <h3>Deck Artwork Customizer</h3>
              <div className="form-group" style={{ display: 'grid', gap: '6px' }}>
                <label>Card Back Image Override URL</label>
                <input
                  type="text"
                  value={customCardBackUrl}
                  onChange={(e) => {
                    setCustomCardBackUrl(e.target.value);
                    localStorage.setItem('qitarot_custom_card_back', e.target.value);
                  }}
                  placeholder="Paste image URL link"
                />
              </div>
              <p className="hint-text">
                Allows customizing tarot deck graphics with historical, modern, or digital artwork. Click save inside card overrides to map specific slot graphics.
              </p>
            </div>
          )}

          {/* Tab Content Section 5: AI configurations */}
          {activeSettingsSection === 'ai' && (
            <div className="stack" style={{ gap: '12px' }}>
              <h3>AI Oracle Preferences</h3>
              <div className="form-group" style={{ display: 'grid', gap: '6px' }}>
                <label>Language Model Choice</label>
                <select
                  value={aiModelPreference}
                  onChange={(e) => {
                    setAiModelPreference(e.target.value);
                    localStorage.setItem('qitarot_ai_model', e.target.value);
                  }}
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Default: Fast & Compact)</option>
                  <option value="gpt-4o">GPT-4o (Deep mystical analysis)</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'grid', gap: '6px' }}>
                <label>Interpretation Style Tone</label>
                <select
                  value={aiStylePreference}
                  onChange={(e) => {
                    setAiStylePreference(e.target.value);
                    localStorage.setItem('qitarot_ai_style', e.target.value);
                  }}
                >
                  <option value="mystical">Mystical & Celestial (Esoteric & archetypal)</option>
                  <option value="psychological">Psychological & Grounded (Jungian reflection)</option>
                  <option value="traditional">Traditional (Strict Rider-Waite-Smith meanings)</option>
                </select>
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderBottom: '1px solid var(--line)', margin: '16px 0' }} />

          <div className="system-status-row">
            <span>Connection Status:</span>
            <strong className={`status-text-${apiStatus}`}>{apiStatus.toUpperCase()}</strong>
          </div>
          <div className="system-detail-box">
            <p><strong>API Endpoint:</strong> <code>api.tarot.qially.com</code></p>
            <p><strong>App Slug:</strong> <code>qitarot</code></p>
            <p><strong>Loaded Templates:</strong> {spreads.length} spreads, {cardCatalog.length} catalog cards</p>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar for Mobile Viewport */}
      <nav className="bottom-tab-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'draw' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('draw');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="tab-icon">🔮</span>
          <span className="tab-label">Draw</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'signals' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('signals');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-label">Signals</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="tab-icon">📜</span>
          <span className="tab-label">History</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('system');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">System</span>
        </button>
      </nav>

      {activeCardSlug && (
        <CardProfileModal cardSlug={activeCardSlug} onClose={() => setActiveCardSlug(null)} />
      )}
    </main>
  );
}
