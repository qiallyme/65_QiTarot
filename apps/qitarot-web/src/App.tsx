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

  const selectedSpread = useMemo(
    () => spreads.find((spread) => spread.id === selectedSpreadId) || spreads[0],
    [selectedSpreadId, spreads]
  );

  useEffect(() => {
    async function load() {
      try {
        await tarotApi.health();
        const [apiSpreads, apiCards, apiPeople, apiAnalytics, apiReadings] = await Promise.all([
          tarotApi.listSpreads(),
          tarotApi.listCards(),
          tarotApi.listPeople(),
          tarotApi.getAnalytics(),
          tarotApi.listReadings({ limit: 50 })
        ]);
        if (apiSpreads.length) {
          setSpreads(apiSpreads);
          setSelectedSpreadId(apiSpreads[0].id);
        }
        if (apiCards.length) setCardCatalog(apiCards);
        setPeople(apiPeople);
        setAnalytics(apiAnalytics);
        setReadings(apiReadings);
        setApiStatus('online');
      } catch (error) {
        console.warn(error);
        setApiStatus('fallback');
        setNotice('QiTarot API unavailable. Using local spread templates only. Saves require qitarot-api.');
      }
    }
    load();
  }, []);

  async function handleSave(input: ReadingInput, photo?: File) {
    setSaving(true);
    setNotice('');
    try {
      const created = await tarotApi.createReading(input);
      const finalReading = photo ? await tarotApi.uploadPhoto(created.id, photo) : created;
      setReadings((current) => [finalReading, ...current]);
      const [nextPeople, nextAnalytics] = await Promise.all([tarotApi.listPeople(), tarotApi.getAnalytics()]);
      setPeople(nextPeople);
      setAnalytics(nextAnalytics);
      setNotice('Reading saved through qitarot-api.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed.');
    } finally {
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
    <main>
      <header className="hero">
        <p className="eyebrow">QiLabs app shell</p>
        <h1>QiTarot</h1>
        <p>
          Spread guide, photo capture, confirmed cards, interpretation, tags, timeline, and carryover tracking, wired to qitarot-api.
        </p>
        <div className={`status ${apiStatus}`}>
          API: {apiStatus === 'checking' ? 'checking' : apiStatus === 'online' ? 'online' : 'fallback mode'}
        </div>
        {notice && <div className="notice">{notice}</div>}
      </header>

      <Dashboard analytics={analytics} onSelectCard={handleSelectCardByName} />

      <SpreadPicker spreads={spreads} selectedId={selectedSpread?.id} onSelect={(spread) => setSelectedSpreadId(spread.id)} />

      {selectedSpread && (
        <section className="panel two-col">
          <div>
            <p className="eyebrow">Layout</p>
            <h2>{selectedSpread.name}</h2>
            <p>{selectedSpread.description}</p>
            <ol className="position-list">
              {selectedSpread.positions.map((position) => (
                <li key={position.key}>
                  <strong>{position.order}. {position.label}</strong>
                  <span>{position.prompt}</span>
                </li>
              ))}
            </ol>
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

      <Timeline readings={readings} onSelectCard={handleSelectCardByName} />

      {activeCardSlug && (
        <CardProfileModal cardSlug={activeCardSlug} onClose={() => setActiveCardSlug(null)} />
      )}
    </main>
  );
}
