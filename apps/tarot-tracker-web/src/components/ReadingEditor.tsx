import { useMemo, useState } from 'react';
import type { ReadingInput, SpreadTemplate } from '../types';
import { ALL_TAROT_CARDS } from '../lib/cards';
import { buildInterpretationPrompt } from '../lib/aiPrompt';

function splitTags(input: string) {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function ReadingEditor({
  spread,
  onSave,
  saving
}: {
  spread: SpreadTemplate;
  saving: boolean;
  onSave: (reading: ReadingInput, photo?: File) => Promise<void>;
}) {
  const [subjectName, setSubjectName] = useState('');
  const [readerName, setReaderName] = useState('');
  const [question, setQuestion] = useState('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [photo, setPhoto] = useState<File | undefined>();
  const [cards, setCards] = useState(() =>
    spread.positions.map((position) => ({
      position_key: position.key,
      position_label: position.label,
      order_index: position.order,
      card_name: '',
      orientation: 'upright' as 'upright' | 'reversed',
      notes: ''
    }))
  );

  const readingInput = useMemo<ReadingInput>(() => {
    return {
      spread_template_id: spread.id,
      subject_name: subjectName || undefined,
      reader_name: readerName || undefined,
      question: question || undefined,
      summary: summary || undefined,
      interpretation: interpretation || undefined,
      tags: splitTags(tags),
      cards
    };
  }, [cards, interpretation, question, readerName, spread.id, subjectName, summary, tags]);

  const promptPayload = useMemo(() => buildInterpretationPrompt(readingInput, spread), [readingInput, spread]);

  return (
    <section className="panel stack">
      <div className="panel-heading">
        <p className="eyebrow">Step 2</p>
        <h2>Capture the reading</h2>
      </div>

      <div className="form-grid">
        <label>
          Subject / person
          <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Who or what this is about" />
        </label>
        <label>
          Reader
          <input value={readerName} onChange={(e) => setReaderName(e.target.value)} placeholder="Optional" />
        </label>
        <label className="wide">
          Question / situation
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What was asked before the pull?" />
        </label>
        <label className="wide">
          Tags
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="love, carryover, warning, work" />
        </label>
        <label className="wide">
          Spread photo
          <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0])} />
        </label>
      </div>

      <div className="card-entry-list">
        {spread.positions.map((position, index) => (
          <div className="card-entry" key={position.key}>
            <div>
              <strong>{position.order}. {position.label}</strong>
              <p>{position.prompt}</p>
            </div>
            <input
              list="tarot-cards"
              value={cards[index]?.card_name || ''}
              onChange={(e) => {
                const next = [...cards];
                next[index] = { ...next[index], card_name: e.target.value };
                setCards(next);
              }}
              placeholder="Card name"
            />
            <select
              value={cards[index]?.orientation || 'upright'}
              onChange={(e) => {
                const next = [...cards];
                next[index] = { ...next[index], orientation: e.target.value as 'upright' | 'reversed' };
                setCards(next);
              }}
            >
              <option value="upright">upright</option>
              <option value="reversed">reversed</option>
            </select>
          </div>
        ))}
      </div>

      <datalist id="tarot-cards">
        {ALL_TAROT_CARDS.map((card) => (
          <option value={card} key={card} />
        ))}
      </datalist>

      <div className="form-grid">
        <label className="wide">
          Summary
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Plain-English summary" />
        </label>
        <label className="wide">
          Interpretation
          <textarea className="tall" value={interpretation} onChange={(e) => setInterpretation(e.target.value)} placeholder="AI or manual interpretation" />
        </label>
      </div>

      <details>
        <summary>AI prompt payload preview</summary>
        <pre>{JSON.stringify(promptPayload, null, 2)}</pre>
      </details>

      <button className="primary" disabled={saving} onClick={() => onSave(readingInput, photo)}>
        {saving ? 'Saving…' : 'Save reading through API Worker'}
      </button>
    </section>
  );
}
