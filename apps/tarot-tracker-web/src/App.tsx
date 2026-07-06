import { useEffect, useMemo, useState } from 'react';
import { SpreadDiagram } from './components/SpreadDiagram';
import { SpreadPicker } from './components/SpreadPicker';
import { ReadingEditor } from './components/ReadingEditor';
import { Timeline } from './components/Timeline';
import { FALLBACK_SPREADS } from './data/localSpreads';
import { tarotApi } from './lib/api';
import type { Reading, ReadingInput, SpreadTemplate } from './types';

export function App() {
  const [spreads, setSpreads] = useState<SpreadTemplate[]>(FALLBACK_SPREADS);
  const [selectedSpreadId, setSelectedSpreadId] = useState<string>(FALLBACK_SPREADS[0].id);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'fallback'>('checking');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const selectedSpread = useMemo(
    () => spreads.find((spread) => spread.id === selectedSpreadId) || spreads[0],
    [selectedSpreadId, spreads]
  );

  useEffect(() => {
    async function load() {
      try {
        await tarotApi.health();
        const [apiSpreads, apiReadings] = await Promise.all([
          tarotApi.listSpreads(),
          tarotApi.listReadings({ limit: 50 })
        ]);
        if (apiSpreads.length) {
          setSpreads(apiSpreads);
          setSelectedSpreadId(apiSpreads[0].id);
        }
        setReadings(apiReadings);
        setApiStatus('online');
      } catch (error) {
        console.warn(error);
        setApiStatus('fallback');
        setNotice('API Worker unavailable. Using local spread templates only. Saves require the Worker route patch.');
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
      setNotice('Reading saved through the API Worker.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">QiLabs app shell</p>
        <h1>Tarot Tracker</h1>
        <p>
          Spread guide, photo capture, confirmed cards, interpretation, tags, timeline, and carryover tracking — wired for the shared API Worker.
        </p>
        <div className={`status ${apiStatus}`}>
          API: {apiStatus === 'checking' ? 'checking' : apiStatus === 'online' ? 'online' : 'fallback mode'}
        </div>
        {notice && <div className="notice">{notice}</div>}
      </header>

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

      {selectedSpread && <ReadingEditor key={selectedSpread.id} spread={selectedSpread} saving={saving} onSave={handleSave} />}

      <Timeline readings={readings} />
    </main>
  );
}
