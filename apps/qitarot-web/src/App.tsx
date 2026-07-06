import { useEffect, useMemo, useState } from 'react';
import { SpreadDiagram } from './components/SpreadDiagram';
import { SpreadPicker } from './components/SpreadPicker';
import { ReadingEditor } from './components/ReadingEditor';
import { Timeline } from './components/Timeline';
import { Dashboard } from './components/Dashboard';
import { CardProfileModal } from './components/CardProfileModal';
import { FALLBACK_CARDS } from './data/cardCatalog';
import { FALLBACK_SPREADS } from './data/localSpreads';
import { tarotApi } from './lib/api';
import type { AnalyticsSummary, Person, Reading, ReadingInput, SpreadTemplate, TarotCard } from './types';

export function App() {
  const [spreads, setSpreads] = useState<SpreadTemplate[]>(FALLBACK_SPREADS);
  const [selectedSpreadId, setSelectedSpreadId] = useState<string>(FALLBACK_SPREADS[0].id);
  const [cardCatalog, setCardCatalog] = useState<TarotCard[]>(FALLBACK_CARDS);
  const [people, setPeople] = useState<Person[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'fallback'>('checking');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeCardSlug, setActiveCardSlug] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{
    type: 'person' | 'tag' | 'suit' | 'arcana' | 'card' | null;
    value: string | null;
  }>({ type: null, value: null });
  const [processingReadingId, setProcessingReadingId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'draw' | 'signals' | 'history' | 'system'>('draw');

  const selectedSpread = useMemo(
    () => spreads.find((spread) => spread.id === selectedSpreadId) || spreads[0],
    [selectedSpreadId, spreads]
  );

  useEffect(() => {
    async function load() {
      try {
        await tarotApi.health();
        setApiStatus('online');

        try {
          const apiSpreads = await tarotApi.listSpreads();
          if (apiSpreads.length) {
            setSpreads(apiSpreads);
            setSelectedSpreadId(apiSpreads[0].id);
          }
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
        setNotice('QiTarot API is offline. Local spreads enabled, saves disabled.');
      }
    }
    load();
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

  async function pollReadingInterpretation(id: string) {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        setProcessingReadingId(null);
        setNotice('AI interpretation is taking a moment in the background. Check timeline shortly.');
        setSaving(false);
        return;
      }

      try {
        const current = await tarotApi.getReading(id);
        if (current.ai_status === 'complete' || current.ai_status === 'failed') {
          clearInterval(interval);
          playChime();

          setReadings((prev) => {
            const idx = prev.findIndex(r => r.id === id);
            if (idx !== -1) {
              return prev.map(r => r.id === id ? current : r);
            }
            return [current, ...prev];
          });

          const [nextPeople, nextAnalytics] = await Promise.all([
            tarotApi.listPeople(),
            tarotApi.getAnalytics()
          ]);
          setPeople(nextPeople);
          setAnalytics(nextAnalytics);

          setProcessingReadingId(null);
          setNotice('AI interpretation complete!');
          setSaving(false);

          // Scroll to timeline to show the card draw details
          document.getElementById('timeline-section')?.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 2000);
  }

  async function handleSave(input: ReadingInput, photo?: File) {
    setSaving(true);
    setNotice('');
    try {
      const created = await tarotApi.createReading(input);
      const finalReading = photo ? await tarotApi.uploadPhoto(created.id, photo) : created;
      
      // Update readings immediately to show up in the timeline
      setReadings((current) => [finalReading, ...current]);

      // Set polling visual state
      setProcessingReadingId(finalReading.id);
      setProcessingStatus('consulting the oracle...');

      pollReadingInterpretation(finalReading.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed.');
      setSaving(false);
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

  return (
    <main className="mobile-viewport">
      <header className="hero">
        <div className="hero-top">
          <h1>QiTarot</h1>
          <div className={`status-dot ${apiStatus}`} title={`API is ${apiStatus}`} />
        </div>
        <p className="subtitle">
          Intuitive tarot workspace powered by qitarot-api and background AI.
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
          <SpreadPicker spreads={spreads} selectedId={selectedSpread?.id} onSelect={(spread) => setSelectedSpreadId(spread.id)} />

          {selectedSpread && (
            <section className="panel two-col">
              <div>
                <p className="eyebrow">Layout description</p>
                <h2>{selectedSpread.name}</h2>
                <p>{selectedSpread.description}</p>
              </div>
              <SpreadDiagram spread={selectedSpread} />
            </section>
          )}

          {selectedSpread && (
            <ReadingEditor
              key={selectedSpread.id}
              spread={selectedSpread}
              cardCatalog={cardCatalog}
              people={people}
              saving={saving}
              onSave={handleSave}
            />
          )}
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
          <h2>System Information</h2>
          <div className="system-status-row">
            <span>Connection Status:</span>
            <strong className={`status-text-${apiStatus}`}>{apiStatus.toUpperCase()}</strong>
          </div>
          <div className="system-detail-box">
            <p><strong>API Endpoint:</strong> <code>api.tarot.qially.com</code></p>
            <p><strong>App Slug:</strong> <code>qitarot</code></p>
            <p><strong>Cloudflare Worker:</strong> <code>qitarot-api</code></p>
            <p><strong>Loaded Templates:</strong> {spreads.length} spreads, {cardCatalog.length} catalog cards</p>
          </div>
          {notice && (
            <div className="system-notice-box">
              <strong>Active notice:</strong>
              <p>{notice}</p>
            </div>
          )}
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

      {processingReadingId && (
        <div className="processing-overlay">
          <div className="processing-box panel">
            <div className="pulse-chime">🔮</div>
            <h2>Generating AI Insights</h2>
            <p>Scanning your cards and consulting the stars...</p>
            <div className="processing-loader"></div>
            <p className="status-text">{processingStatus}</p>
          </div>
        </div>
      )}
    </main>
  );
}
