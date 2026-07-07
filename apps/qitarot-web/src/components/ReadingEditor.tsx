import { useEffect, useMemo, useState } from 'react';
import { SpreadDiagram } from './SpreadDiagram';
import { SpreadPicker } from './SpreadPicker';
import type { Orientation, Person, ReadingCardInput, ReadingInput, SpreadPosition, SpreadTemplate, TarotCard } from '../types';
import { tarotApi } from '../lib/api';

function splitTags(input: string) {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function initialCards(spread: SpreadTemplate): ReadingCardInput[] {
  return spread.positions.map((position) => ({
    position_key: position.key,
    position_label: position.label,
    order_index: position.order,
    card_name: '',
    orientation: 'upright',
    notes: ''
  }));
}

function meaningFor(card: TarotCard, orientation: Orientation) {
  return orientation === 'reversed' ? card.meaning_reversed : card.meaning_upright;
}

function labelsForGroup(card: TarotCard) {
  if (card.arcana === 'major') return 'Major Arcana';
  if (card.suit === 'wands') return 'Wands';
  if (card.suit === 'cups') return 'Cups';
  if (card.suit === 'swords') return 'Swords';
  return 'Pentacles';
}

function cardInputFor(position: SpreadPosition, card: TarotCard, orientation: Orientation): ReadingCardInput {
  return {
    card_id: card.id.startsWith('local-') ? undefined : card.id,
    card_slug: card.slug,
    position_key: position.key,
    position_label: position.label,
    order_index: position.order,
    card_name: card.name,
    orientation,
    card_image_url: card.image_url,
    meaning_upright_snapshot: card.meaning_upright,
    meaning_reversed_snapshot: card.meaning_reversed,
    meaning_snapshot: meaningFor(card, orientation),
    notes: ''
  };
}

const ORACLE_MESSAGES = [
  'Tuning into the cards...',
  'Checking the signals...',
  'Reading the spread...',
  'Consulting the oracle...',
  'Decrypting the alignment...'
];

export function ReadingEditor({
  spreads,
  cardCatalog,
  people,
  onSave,
  saving
}: {
  spreads: SpreadTemplate[];
  cardCatalog: TarotCard[];
  people: Person[];
  saving: boolean;
  onSave: (reading: ReadingInput, photo?: File) => Promise<void>;
}) {
  // Global Wizard Step: 1 = Pick Spread, 2 = Shuffle & Pull, 3 = Photo, 4 = Confirm Cards, 5 = Interpretation, 6 = Save/Discard
  const [step, setStep] = useState(1);
  const [spread, setSpread] = useState<SpreadTemplate>(() => spreads[0] || FALLBACK_SPREADS[0]);

  // Profile Defaults & Metadata States
  const [subjectType, setSubjectType] = useState<'myself' | 'other'>('myself');
  const [subjectName, setSubjectName] = useState('');
  const [readerName, setReaderName] = useState('');
  const [question, setQuestion] = useState('');
  const [tags, setTags] = useState('');
  const [summary, setSummary] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [photo, setPhoto] = useState<File | undefined>();
  const [cards, setCards] = useState<ReadingCardInput[]>(() => initialCards(spread));
  const [selectedSlotKey, setSelectedSlotKey] = useState('');

  // UI state for search dropdowns in Confirm Cards step
  const [activeSearchKey, setActiveSearchKey] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [cardQuery, setCardQuery] = useState('');

  // AI loading status & rotating messages
  const [generatingInterpretation, setGeneratingInterpretation] = useState(false);
  const [oracleMsgIndex, setOracleMsgIndex] = useState(0);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  // Sync profile defaults when step/mount changes
  useEffect(() => {
    const defaultReader = localStorage.getItem('qitarot_reader_name') || 'Reader';
    const defaultSelf = localStorage.getItem('qitarot_self_label') || 'Myself';
    setReaderName(defaultReader);
    if (subjectType === 'myself') {
      setSubjectName(defaultSelf);
    }
  }, [subjectType, step]);

  // Update cards structure when spread template is chosen
  const handleSpreadSelect = (selected: SpreadTemplate) => {
    setSpread(selected);
    setCards(initialCards(selected));
    setSelectedSlotKey(selected.positions[0]?.key || '');
    setStep(2);
  };

  const photoPreviewUrl = useMemo(() => {
    if (!photo) return undefined;
    try {
      return URL.createObjectURL(photo);
    } catch (e) {
      return undefined;
    }
  }, [photo]);

  const peopleByName = useMemo(
    () => new Map(people.map((person) => [person.display_name.trim().toLowerCase(), person])),
    [people]
  );

  const cardById = useMemo(() => new Map(cardCatalog.map((card) => [card.id, card])), [cardCatalog]);
  const spreadPositionByKey = useMemo(() => new Map(spread.positions.map((position) => [position.key, position])), [spread.positions]);

  const selectedPerson = peopleByName.get(subjectName.trim().toLowerCase());

  const filteredCards = useMemo(() => {
    const query = cardQuery.trim().toLowerCase();
    return cardCatalog.filter((card) => {
      const searchText = [
        card.name,
        card.arcana,
        card.suit,
        card.rank,
        card.element,
        ...card.upright_keywords,
        ...card.reversed_keywords
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !query || searchText.includes(query);
    });
  }, [cardCatalog, cardQuery]);

  const readingInput = useMemo<ReadingInput>(() => {
    return {
      spread_template_id: spread.id,
      person_id: selectedPerson?.id,
      person_name: subjectName || undefined,
      subject_name: subjectName || undefined,
      reader_name: readerName || undefined,
      question: question || undefined,
      summary: summary || undefined,
      interpretation: interpretation || undefined,
      tags: splitTags(tags),
      cards
    };
  }, [cards, interpretation, question, readerName, selectedPerson?.id, spread.id, subjectName, summary, tags]);

  // Rotate Oracle messages while generating interpretation
  useEffect(() => {
    if (!generatingInterpretation) return;
    const interval = setInterval(() => {
      setOracleMsgIndex((prev) => (prev + 1) % ORACLE_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [generatingInterpretation]);

  const updateAutopopulatedTags = (updatedCards: ReadingCardInput[]) => {
    const kws = new Set<string>();
    for (const c of updatedCards) {
      if (!c.card_name) continue;
      const catalogCard = cardCatalog.find(cc => cc.name.toLowerCase() === c.card_name.toLowerCase());
      if (catalogCard) {
        const keywords = c.orientation === 'reversed' ? catalogCard.reversed_keywords : catalogCard.upright_keywords;
        keywords.slice(0, 2).forEach(k => kws.add(k.toLowerCase()));
      }
    }
    if (kws.size > 0) {
      setTags(Array.from(kws).join(', '));
    }
  };

  const setCardAtPosition = (positionKey: string, card: TarotCard) => {
    const position = spreadPositionByKey.get(positionKey);
    if (!position) return;

    setCards((current) => {
      const existing = current.find((row) => row.position_key === positionKey);
      const orientation = existing?.orientation || 'upright';
      const next = current.map((row) => (row.position_key === positionKey ? cardInputFor(position, card, orientation) : row));
      updateAutopopulatedTags(next);
      return next;
    });

    const currentIndex = spread.positions.findIndex((positionRow) => positionRow.key === positionKey);
    const nextEmpty = spread.positions.slice(currentIndex + 1).find((positionRow) => {
      const currentCard = cards.find((row) => row.position_key === positionRow.key);
      return !currentCard?.card_name;
    });
    if (nextEmpty) setSelectedSlotKey(nextEmpty.key);
  };

  const toggleOrientation = (positionKey: string) => {
    setCards((current) => {
      const next = current.map((row) => {
        if (row.position_key !== positionKey || !row.card_name) return row;
        const nextOrientation: Orientation = row.orientation === 'reversed' ? 'upright' : 'reversed';
        return {
          ...row,
          orientation: nextOrientation,
          meaning_snapshot: nextOrientation === 'reversed' ? row.meaning_reversed_snapshot : row.meaning_upright_snapshot
        };
      });
      updateAutopopulatedTags(next);
      return next;
    });
    setSelectedSlotKey(positionKey);
  };

  const updateNotes = (positionKey: string, notes: string) => {
    setCards((current) => current.map((row) => (row.position_key === positionKey ? { ...row, notes } : row)));
  };

  const triggerInterpretationRequest = async () => {
    setGeneratingInterpretation(true);
    try {
      const result = await tarotApi.generateDraftInterpretation(readingInput);
      if (result.interpretation) setInterpretation(result.interpretation);
      if (result.summary) setSummary(result.summary);
    } catch (err) {
      console.warn('AI interpretation request failed:', err);
    } finally {
      setGeneratingInterpretation(false);
      setStep(5);
    }
  };

  async function handlePhotoChange(file?: File) {
    if (!file) return;
    setPhoto(file);
    setAnalyzingPhoto(true);
    try {
      const ocrResult = await tarotApi.runOcrPreSave(file, spread.positions);
      setCards((current) => {
        const next = [...current];
        for (const match of ocrResult.cards) {
          const idx = next.findIndex((c) => c.position_key === match.position_key);
          if (idx !== -1) {
            const catCard = cardCatalog.find((cc) => cc.name.toLowerCase() === match.card_name.toLowerCase());
            if (catCard) {
              next[idx] = cardInputFor(spread.positions[idx], catCard, match.orientation);
            }
          }
        }
        updateAutopopulatedTags(next);
        return next;
      });
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setAnalyzingPhoto(false);
      setStep(4);
    }
  }

  const removeTag = (tagToRemove: string) => {
    const next = splitTags(tags).filter(t => t !== tagToRemove);
    setTags(next.join(', '));
  };

  const handleDiscard = () => {
    setStep(1);
    setPhoto(undefined);
    setQuestion('');
    setTags('');
    setSummary('');
    setInterpretation('');
    setCards(initialCards(spread));
  };

  const handleSaveReading = async () => {
    await onSave(readingInput, photo);
    handleDiscard();
  };

  return (
    <div className="guided-flow-container">
      {/* Wizard Progress Header */}
      <div className="guided-progressbar">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className={`progressbar-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
            onClick={() => step > i && setStep(i)}
          />
        ))}
      </div>

      {/* Step 1: Pick a Spread */}
      {step === 1 && (
        <div className="flow-step step-pick-spread">
          <SpreadPicker
            spreads={spreads}
            selectedId={spread.id}
            onSelect={handleSpreadSelect}
          />
        </div>
      )}

      {/* Step 2: Shuffle and Pull */}
      {step === 2 && (
        <div className="flow-step step-shuffle-pull panel stack">
          <div className="panel-heading">
            <p className="eyebrow">Step 2</p>
            <h2>Shuffle & Pull</h2>
          </div>
          <p className="step-guide">
            Shuffle your deck thoroughly, focus on your question, and pull the cards matching the layout below.
          </p>

          <div className="spread-preview-centered">
            <SpreadDiagram spread={spread} />
          </div>

          <div className="form-grid">
            <div className="subject-type-row wide">
              <label>Subject</label>
              <div className="segmented">
                <button
                  type="button"
                  className={subjectType === 'myself' ? 'active' : ''}
                  onClick={() => {
                    setSubjectType('myself');
                    setSubjectName(localStorage.getItem('qitarot_self_label') || 'Myself');
                  }}
                >
                  Myself
                </button>
                <button
                  type="button"
                  className={subjectType === 'other' ? 'active' : ''}
                  onClick={() => {
                    setSubjectType('other');
                    setSubjectName('');
                  }}
                >
                  Other
                </button>
              </div>
            </div>

            {subjectType === 'other' && (
              <label className="wide">
                Person Name
                <input
                  value={subjectName}
                  list="qitarot-people"
                  onChange={(event) => setSubjectName(event.target.value)}
                  placeholder="Enter name"
                />
              </label>
            )}

            <label className="wide">
              Reader Display Name
              <input
                value={readerName}
                onChange={(event) => setReaderName(event.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="wide">
              Question / situation
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What is this inquiry about?"
              />
            </label>
          </div>

          <div className="step-actions">
            <button type="button" className="secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button type="button" className="primary" onClick={() => setStep(3)}>
              Next: Snap Photo →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Snap or Import Photo */}
      {step === 3 && (
        <div className="flow-step step-snap-photo panel stack">
          <div className="panel-heading">
            <p className="eyebrow">Step 3</p>
            <h2>Capture Spread Photo</h2>
          </div>
          <p className="step-guide">
            Capture or import a photo of your laid out cards. Aligning cards neatly improves automated recognition accuracy.
          </p>

          <div className="photo-capture-box">
            <label className="photo-import-label capture-label">
              <span>📸 Capture / Import Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => handlePhotoChange(event.target.files?.[0])}
              />
            </label>

            {analyzingPhoto && (
              <div className="ocr-analyzing-indicator">
                <div className="processing-loader"></div>
                <p>Analyzing card positions and shapes...</p>
              </div>
            )}

            {photoPreviewUrl && (
              <div className="photo-import-preview">
                <img src={photoPreviewUrl} alt="Spread photo preview" />
                <button type="button" className="clear-photo-btn button-link" onClick={() => setPhoto(undefined)}>
                  ✕ Remove Image
                </button>
              </div>
            )}
          </div>

          <div className="step-actions">
            <button type="button" className="secondary" onClick={() => setStep(2)}>
              ← Back
            </button>
            <button type="button" className="primary" onClick={() => setStep(4)}>
              Skip & Manual Confirm →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm Cards */}
      {step === 4 && (
        <div className="flow-step step-confirm-cards panel stack">
          <div className="panel-heading">
            <p className="eyebrow">Step 4</p>
            <h2>Confirm Cards</h2>
          </div>
          <p className="step-guide">
            Confirm estimated cards at each position. Search to pick manually if incorrect.
          </p>

          <div className="positions-confirm-list">
            {spread.positions.map((pos) => {
              const card = cards.find(c => c.position_key === pos.key);
              const isSlotActive = selectedSlotKey === pos.key;
              return (
                <div
                  key={pos.key}
                  className={`confirm-position-item ${isSlotActive ? 'active' : ''}`}
                >
                  <div className="item-summary-header" onClick={() => setSelectedSlotKey(pos.key)}>
                    <div className="pos-badge-label">
                      <span className="pos-num-indicator">{pos.order}</span>
                      <strong>{pos.label}</strong>
                    </div>
                    <div className="pos-card-badge-row">
                      <span className={`pos-card-name ${card?.card_name ? 'filled' : 'empty'}`}>
                        {card?.card_name || 'Not Chosen'}
                      </span>
                      {card?.card_name && (
                        <span className="orientation-tag">
                          {card.orientation === 'reversed' ? '🔄' : '☀️'}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSlotActive && (
                    <div className="item-detail-editor">
                      <p className="hint-text">{pos.prompt}</p>
                      
                      <div className="confirm-fields-row">
                        <button
                          type="button"
                          className={`orientation-toggle ${card?.orientation}`}
                          onClick={() => toggleOrientation(pos.key)}
                        >
                          {card?.orientation === 'reversed' ? '🔄 Reversed' : '☀️ Upright'}
                        </button>

                        <input
                          type="text"
                          placeholder="Search card name..."
                          value={activeSearchKey === pos.key ? searchQueries[pos.key] || '' : card?.card_name || ''}
                          onFocus={() => {
                            setActiveSearchKey(pos.key);
                            setCardQuery(card?.card_name || '');
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchQueries(prev => ({ ...prev, [pos.key]: val }));
                            setCardQuery(val);
                          }}
                        />
                      </div>

                      {activeSearchKey === pos.key && cardQuery.trim() && (
                        <div className="inline-card-results">
                          {filteredCards.slice(0, 5).map((catCard) => (
                            <button
                              type="button"
                              className="inline-result-btn"
                              key={catCard.id}
                              onClick={() => {
                                setCardAtPosition(pos.key, catCard);
                                setSearchQueries(prev => ({ ...prev, [pos.key]: catCard.name }));
                                setActiveSearchKey(null);
                                setCardQuery('');
                              }}
                            >
                              {catCard.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={card?.notes || ''}
                        onChange={(e) => updateNotes(pos.key, e.target.value)}
                        placeholder="Add reader specific notes or intuitive insights..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="step-actions">
            <button type="button" className="secondary" onClick={() => setStep(3)}>
              ← Back
            </button>
            <button
              type="button"
              className="primary"
              disabled={!cards.some(c => c.card_name)}
              onClick={triggerInterpretationRequest}
            >
              Analyze Reading →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Interpretation + Summary */}
      {step === 5 && (
        <div className="flow-step step-interpretation panel stack">
          {generatingInterpretation ? (
            <div className="oracle-loading-state">
              <div className="pulse-oracle">🔮</div>
              <h2>Decrypting the Signals</h2>
              <div className="processing-loader"></div>
              <p className="oracle-rotating-message">{ORACLE_MESSAGES[oracleMsgIndex]}</p>
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <p className="eyebrow">Step 5</p>
                <h2>Interpretation Insights</h2>
              </div>

              <div className="form-grid">
                <label className="wide">
                  Detailed Interpretation
                  <textarea
                    className="tall"
                    value={interpretation}
                    onChange={(event) => setInterpretation(event.target.value)}
                    placeholder="AI or manual interpretation details..."
                  />
                </label>

                <label className="wide">
                  Summary (In simple terms)
                  <textarea
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="Simple plain-English summary..."
                  />
                </label>

                <div className="wide suggested-tags-box">
                  <label>Suggested Tags</label>
                  <div className="chips-container">
                    {splitTags(tags).map(t => (
                      <span className="chip" key={t}>
                        #{t}
                        <button type="button" className="remove-chip-btn" onClick={() => removeTag(t)}>✕</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="add-chip-input"
                      placeholder="+ Add Tag (Press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const target = e.target as HTMLInputElement;
                          const newTag = target.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                          if (newTag && !splitTags(tags).includes(newTag)) {
                            setTags(prev => prev ? `${prev}, ${newTag}` : newTag);
                          }
                          target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="retry-interpretation-row">
                <button type="button" className="secondary button-link" onClick={triggerInterpretationRequest}>
                  🔄 Retry Interpretation
                </button>
              </div>

              <div className="step-actions">
                <button type="button" className="secondary" onClick={() => setStep(4)}>
                  ← Back
                </button>
                <button type="button" className="primary" onClick={() => setStep(6)}>
                  Next: Complete Reading →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 6: Save or Discard */}
      {step === 6 && (
        <div className="flow-step step-complete panel stack">
          <div className="panel-heading">
            <p className="eyebrow">Step 6</p>
            <h2>Save or Discard</h2>
          </div>
          <p className="step-guide">
            Confirm details below to record this reading in your journal. Discarding will completely erase current draft.
          </p>

          <div className="final-summary-card">
            <div className="summary-section-row">
              <span>Spread:</span>
              <strong>{spread.name}</strong>
            </div>
            <div className="summary-section-row">
              <span>Subject:</span>
              <strong>{subjectName}</strong>
            </div>
            <div className="summary-section-row">
              <span>Cards Confirmed:</span>
              <div className="confirmed-cards-pills">
                {cards.filter(c => c.card_name).map(c => (
                  <span key={c.position_key} className="confirmed-pill">
                    {c.position_label}: {c.card_name} ({c.orientation})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="step-actions vertical-actions">
            <button
              type="button"
              className="primary save-btn"
              disabled={saving}
              onClick={handleSaveReading}
            >
              {saving ? 'Saving to Journal...' : '✓ Save to Journal'}
            </button>
            <button
              type="button"
              className="danger discard-btn"
              onClick={handleDiscard}
            >
              ✕ Discard Reading
            </button>
          </div>

          <div className="step-actions">
            <button type="button" className="secondary" onClick={() => setStep(5)}>
              ← Back
            </button>
          </div>
        </div>
      )}

      <datalist id="qitarot-people">
        {people.map((person) => (
          <option value={person.display_name} key={person.id} />
        ))}
      </datalist>
    </div>
  );
}

const FALLBACK_SPREADS: SpreadTemplate[] = [
  {
    id: 'single',
    slug: 'one-card-pull',
    name: 'One Card Pull',
    description: 'A single card pull for daily reflection or simple yes/no questions.',
    card_count: 1,
    positions: [
      { key: 'focus', label: 'Daily Focus', order: 1, prompt: 'What energy to focus on today?', x: 50, y: 50 }
    ]
  }
];
