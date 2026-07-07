import { useEffect, useMemo, useState } from 'react';
import { SpreadDiagram } from './SpreadDiagram';
import { SpreadPicker } from './SpreadPicker';
import type { Orientation, Person, Reading, ReadingCardInput, ReadingInput, SpreadPosition, SpreadTemplate, TarotCard } from '../types';
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
  onCompleteReading,
  onNavigateTab
}: {
  spreads: SpreadTemplate[];
  cardCatalog: TarotCard[];
  people: Person[];
  onCompleteReading: (reading: Reading) => void;
  onNavigateTab: (tab: 'draw' | 'signals' | 'history' | 'system') => void;
}) {
  // Wizard Steps:
  // 1 = Pick Spread, 2 = Shuffle & Pull, 3 = Photo, 4 = Confirm Cards, 5 = Final Review, 6 = Reading Report, 7 = Success
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
  const [rating, setRating] = useState<number>(5);
  const [photo, setPhoto] = useState<File | undefined>();
  const [cards, setCards] = useState<ReadingCardInput[]>(() => initialCards(spread));
  const [selectedSlotKey, setSelectedSlotKey] = useState('');

  // Active saved reading reference (for step 6 report actions)
  const [activeReadingId, setActiveReadingId] = useState<string | null>(null);
  const [readingSavedState, setReadingSavedState] = useState(false);

  // Notes configuration states
  const [showNotesKeys, setShowNotesKeys] = useState<Record<string, boolean>>({});

  // UI state for search dropdowns in Confirm Cards step
  const [activeSearchKey, setActiveSearchKey] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [cardQuery, setCardQuery] = useState('');

  // AI loading status & rotating messages
  const [generatingInterpretation, setGeneratingInterpretation] = useState(false);
  const [oracleMsgIndex, setOracleMsgIndex] = useState(0);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  // Web Speech API Synthesis state
  const [speechState, setSpeechState] = useState<'stopped' | 'playing' | 'paused'>('stopped');

  // Sync profile defaults when step/mount changes
  useEffect(() => {
    const defaultReader = localStorage.getItem('qitarot_reader_name') || 'Reader';
    const defaultSelf = localStorage.getItem('qitarot_self_label') || 'Myself';
    setReaderName(defaultReader);
    if (subjectType === 'myself') {
      setSubjectName(defaultSelf);
    }
  }, [subjectType, step]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

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

  const cardPositionMap = useMemo(() => new Map(spread.positions.map((p) => [p.key, p])), [spread.positions]);
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
      cards,
      rating: rating
    };
  }, [cards, interpretation, question, readerName, selectedPerson?.id, spread.id, subjectName, summary, tags, rating]);

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

  const toggleNotesInput = (positionKey: string) => {
    setShowNotesKeys(prev => ({ ...prev, [positionKey]: !prev[positionKey] }));
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

  const handleDiscard = async () => {
    window.speechSynthesis.cancel();
    setSpeechState('stopped');
    if (activeReadingId) {
      try {
        await tarotApi.deleteReading(activeReadingId);
      } catch (err) {
        console.warn('Failed to delete discarded reading:', err);
      }
    }
    resetState();
  };

  const resetState = () => {
    setStep(1);
    setPhoto(undefined);
    setQuestion('');
    setTags('');
    setSummary('');
    setInterpretation('');
    setRating(5);
    setActiveReadingId(null);
    setReadingSavedState(false);
    setCards(initialCards(spread));
  };

  const handleInterpretReading = async () => {
    setGeneratingInterpretation(true);
    setStep(6); // Navigate to Report view (showing Loading Oracle state)

    try {
      const created = await tarotApi.createReading(readingInput);
      const finalReading = photo ? await tarotApi.uploadPhoto(created.id, photo) : created;
      setActiveReadingId(finalReading.id);

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 25) {
          clearInterval(interval);
          setGeneratingInterpretation(false);
          alert('AI interpretation timed out. Reading saved as draft.');
          return;
        }

        try {
          const current = await tarotApi.getReading(finalReading.id);
          if (current.ai_status === 'complete' || current.ai_status === 'failed') {
            clearInterval(interval);
            setInterpretation(current.interpretation || '');
            setSummary(current.summary || '');
            setGeneratingInterpretation(false);
          }
        } catch (err) {
          console.warn('Polling error:', err);
        }
      }, 2000);

    } catch (err) {
      console.error('Failed to create interpretation reading:', err);
      setGeneratingInterpretation(false);
      setStep(5);
    }
  };

  const handleRegenerateInterpretation = async () => {
    if (!activeReadingId || generatingInterpretation) return;
    setGeneratingInterpretation(true);
    window.speechSynthesis.cancel();
    setSpeechState('stopped');

    try {
      await tarotApi.requestInterpretation(activeReadingId);
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 20) {
          clearInterval(interval);
          setGeneratingInterpretation(false);
          return;
        }
        const current = await tarotApi.getReading(activeReadingId);
        if (current.ai_status === 'complete' || current.ai_status === 'failed') {
          clearInterval(interval);
          setInterpretation(current.interpretation || '');
          setSummary(current.summary || '');
          setGeneratingInterpretation(false);
        }
      }, 2000);
    } catch (err) {
      console.error('Regeneration request failed:', err);
      setGeneratingInterpretation(false);
    }
  };

  const handleFinalizeSave = async () => {
    if (!activeReadingId) return;

    try {
      const updated = await tarotApi.updateReading(activeReadingId, {
        rating,
        tags: splitTags(tags),
        summary,
        interpretation
      });
      onCompleteReading(updated);
      setReadingSavedState(true);
      setStep(7); // Show Success screen
    } catch (err) {
      console.error('Failed to save reading details:', err);
    }
  };

  // Sort confirmed cards by pull order_index for report view
  const sortedReportCards = useMemo(() => {
    return [...cards]
      .filter((c) => c.card_name)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [cards]);

  // Read Aloud speech script generator
  const handleReadAloud = () => {
    if (speechState === 'playing') {
      window.speechSynthesis.pause();
      setSpeechState('paused');
      return;
    }
    if (speechState === 'paused') {
      window.speechSynthesis.resume();
      setSpeechState('playing');
      return;
    }

    window.speechSynthesis.cancel();

    // Prepare Narration script (strips markdown details for clean speech)
    const cardReadings = sortedReportCards.map((c) => {
      const pos = cardPositionMap.get(c.position_key);
      const posMeaning = pos ? pos.prompt : '';
      return `In position ${c.position_label}, representing ${posMeaning || 'this aspect'}, you pulled the ${c.card_name} ${c.orientation === 'reversed' ? 'reversed' : 'upright'}. ${c.notes ? `Your card insights note: ${c.notes}` : ''}`;
    }).join('. ');

    const narrationScript = [
      `Tarot Reading report for ${subjectName || 'the Querent'}.`,
      question ? `The situation brought forward is: ${question}.` : 'This is a general spread inquiry.',
      `The central themes identified are: ${tags || 'transition and calibration'}.`,
      cardReadings,
      `Synthesis of this draw:`,
      interpretation,
      summary ? `In plain English: ${summary}` : '',
      `Sit with what resonates, leave what does not.`
    ].join('\n\n');

    const utterance = new SpeechSynthesisUtterance(narrationScript);
    utterance.rate = 0.95; // elegant pacing
    utterance.onend = () => setSpeechState('stopped');
    utterance.onerror = () => setSpeechState('stopped');

    window.speechSynthesis.speak(utterance);
    setSpeechState('playing');
  };

  const handleStopSpeech = () => {
    window.speechSynthesis.cancel();
    setSpeechState('stopped');
  };

  // Copy text or Web Share API
  const handleShareReading = async () => {
    const shareTitle = `QiTarot Reading Report`;
    const shareText = `A Tarot reading about: "${question || 'General inquiry'}". takeaway: ${summary}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.warn('Share sheet cancelled:', err);
      }
    } else {
      // Clipboard fallback
      const fullText = `${shareTitle}\n\nSubject: ${subjectName}\nQuestion: ${question || 'General'}\nTakeaway: ${summary}\n\nInterpretation Details:\n${interpretation}`;
      try {
        await navigator.clipboard.writeText(fullText);
        alert('Reading report copied to clipboard!');
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  const handleCopyRawText = () => {
    const fullText = `QiTarot Report\nSpread: ${spread.name}\nSubject: ${subjectName}\nQuestion: ${question || 'General'}\n\nInterpretation:\n${interpretation}\n\nSummary:\n${summary}`;
    navigator.clipboard.writeText(fullText);
    alert('Report copy complete.');
  };

  return (
    <div className="guided-flow-container">
      {/* Wizard Progress Header */}
      {step < 7 && (
        <div className="guided-progressbar no-print">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className={`progressbar-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
              onClick={() => step > i && setStep(i)}
            />
          ))}
        </div>
      )}

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
          <div className="panel-heading centered-heading">
            <p className="eyebrow">Step 2</p>
            <h2>Shuffle & Pull</h2>
          </div>
          <p className="step-guide centered-text">
            Shuffle your deck, focus on your question, and draw card counts matching the spread.
          </p>

          <div className="spread-preview-centered">
            <SpreadDiagram spread={spread} layoutType="flex" />
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
                  Other Subject
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
              Reader Name
              <input
                value={readerName}
                onChange={(event) => setReaderName(event.target.value)}
                placeholder="Optional reader name"
              />
            </label>

            <label className="wide">
              Question / Situation
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
              Next: Add Photo →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Snap or Import Photo */}
      {step === 3 && (
        <div className="flow-step step-snap-photo panel stack">
          <div className="panel-heading centered-heading">
            <p className="eyebrow">Step 3</p>
            <h2>Spread Photo</h2>
          </div>
          <p className="step-guide centered-text">
            Upload or capture a photo of your cards. Visual scanner will match card texts automatically.
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
                <p>Reading card titles and layouts...</p>
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
              Skip & Manual Choose →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm Cards (Split Verification Panel) */}
      {step === 4 && (
        <div className="flow-step step-confirm-cards panel stack">
          <div className="panel-heading">
            <p className="eyebrow">Step 4</p>
            <h2>Confirm Cards</h2>
          </div>
          <p className="step-guide">
            Confirm detected cards on each slot. Click card to edit.
          </p>

          <div className="confirm-split-container">
            {photoPreviewUrl && (
              <div className="uploaded-photo-preview-panel">
                <img src={photoPreviewUrl} alt="Real spread layout" />
              </div>
            )}
            <div className="reconstructed-diagram-panel">
              <SpreadDiagram
                spread={spread}
                placedCards={cards}
                selectedSlotKey={selectedSlotKey}
                onSelectSlot={setSelectedSlotKey}
                layoutType="flex"
              />
            </div>
          </div>

          {/* Selected Slot Interactive Editor */}
          {selectedSlotKey && (
            <div className="selected-slot-verification-editor panel">
              {(() => {
                const pos = spreadPositionByKey.get(selectedSlotKey);
                const card = cards.find((c) => c.position_key === selectedSlotKey);
                if (!pos) return null;
                const isNotesActive = showNotesKeys[pos.key] || false;
                return (
                  <div className="stack" style={{ gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>Slot: {pos.label} ({pos.order}/{spread.card_count})</h4>
                      <button
                        type="button"
                        className={`orientation-toggle-btn ${card?.orientation}`}
                        onClick={() => toggleOrientation(pos.key)}
                      >
                        {card?.orientation === 'reversed' ? '🔄 Reversed' : '☀️ Upright'}
                      </button>
                    </div>
                    <p className="hint-text" style={{ margin: '0' }}>{pos.prompt}</p>

                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search card catalog..."
                        value={activeSearchKey === pos.key ? searchQueries[pos.key] || '' : card?.card_name || ''}
                        onFocus={() => {
                          setActiveSearchKey(pos.key);
                          setCardQuery(card?.card_name || '');
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchQueries((prev) => ({ ...prev, [pos.key]: val }));
                          setCardQuery(val);
                        }}
                      />
                      {activeSearchKey === pos.key && cardQuery.trim() && (
                        <div className="inline-card-results">
                          {filteredCards.slice(0, 5).map((catCard) => (
                            <button
                              type="button"
                              className="inline-result-btn"
                              key={catCard.id}
                              onClick={() => {
                                setCardAtPosition(pos.key, catCard);
                                setSearchQueries((prev) => ({ ...prev, [pos.key]: catCard.name }));
                                setActiveSearchKey(null);
                                setCardQuery('');
                              }}
                            >
                              {catCard.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="optional-notes-toggler-row">
                      <label className="checkbox-notes-label">
                        <input
                          type="checkbox"
                          checked={isNotesActive}
                          onChange={() => toggleNotesInput(pos.key)}
                        />
                        Add interpretive slot notes
                      </label>
                    </div>

                    {isNotesActive && (
                      <textarea
                        value={card?.notes || ''}
                        onChange={(e) => updateNotes(pos.key, e.target.value)}
                        placeholder="Add reader specific insights for this card..."
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="step-actions">
            <button type="button" className="secondary" onClick={() => setStep(3)}>
              ← Back
            </button>
            <button
              type="button"
              className="primary"
              disabled={!cards.some((c) => c.card_name)}
              onClick={() => setStep(5)}
            >
              Confirm Cards →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Final Review */}
      {step === 5 && (
        <div className="flow-step step-final-review panel stack">
          <div className="panel-heading">
            <p className="eyebrow">Step 5</p>
            <h2>Final Review</h2>
          </div>
          <p className="step-guide">
            Review your digital spread layout and question context. Clicking Interpret Reading will analyze the cards.
          </p>

          <div className="review-digital-reconstruction">
            <SpreadDiagram spread={spread} placedCards={cards} layoutType="flex" />
          </div>

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
              <span>Reader:</span>
              <strong>{readerName || 'Self'}</strong>
            </div>
            <div className="summary-section-row">
              <span>Question:</span>
              <strong>{question || 'General Reading'}</strong>
            </div>
            <div className="summary-section-row">
              <span>Confirmed Cards:</span>
              <div className="confirmed-cards-pills">
                {cards.filter(c => c.card_name).map(c => (
                  <span key={c.position_key} className="confirmed-pill">
                    {c.position_label}: {c.card_name} ({c.orientation})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="step-actions">
            <button type="button" className="secondary" onClick={() => setStep(4)}>
              ← Back
            </button>
            <button type="button" className="primary" onClick={handleInterpretReading}>
              Interpret Reading →
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Dedicated Reading Report View (Collapsible, Narratable, Shareable) */}
      {step === 6 && (
        <div className="flow-step step-interpretation-report">
          {generatingInterpretation ? (
            <div className="oracle-loading-state panel">
              <div className="pulse-oracle">🔮</div>
              <h2>Decrypting the Signals</h2>
              <div className="processing-loader"></div>
              <p className="oracle-rotating-message">{ORACLE_MESSAGES[oracleMsgIndex]}</p>
            </div>
          ) : (
            <div className="panel stack reading-report-panel">
              {/* Report Header */}
              <div className="report-main-header">
                <div className="header-meta no-print">
                  <span className="eyebrow-accent">Tarot Reading Report</span>
                  <time>{new Date().toLocaleDateString()}</time>
                </div>
                <h2 className="report-title">The Oracle Report</h2>
                <div className="report-meta-grid">
                  <div className="meta-row">
                    <span>Subject:</span> <strong>{subjectName}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Reader:</span> <strong>{readerName || 'Self'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Spread Template:</span> <strong>{spread.name}</strong>
                  </div>
                  {question && (
                    <div className="meta-row wide">
                      <span>Inquiry Situation:</span> <strong>"{question}"</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Ribbon (Read Aloud, Share, PDF) */}
              <div className="report-action-ribbon no-print">
                <div className="speech-controls-group">
                  <button
                    type="button"
                    className={`speech-btn primary-speech ${speechState === 'playing' ? 'playing' : ''}`}
                    onClick={handleReadAloud}
                  >
                    {speechState === 'playing' ? '⏸ Pause Narration' : '🔊 Listen Reading'}
                  </button>
                  {speechState !== 'stopped' && (
                    <button type="button" className="secondary stop-speech-btn" onClick={handleStopSpeech}>
                      ⏹ Stop
                    </button>
                  )}
                </div>
                <div className="export-controls-group">
                  <button type="button" className="secondary" onClick={handleShareReading}>
                    🔗 Share Reading
                  </button>
                  <button type="button" className="secondary" onClick={handleCopyRawText}>
                    📋 Copy Text
                  </button>
                  <button type="button" className="secondary" onClick={() => window.print()}>
                    🖨 Print / PDF
                  </button>
                </div>
              </div>

              {/* Reconstructed Cards pull display list in exact pull order */}
              <div className="report-cards-pull-section">
                <h4>Spread Layout (Pull Order)</h4>
                <div className="report-cards-grid">
                  {sortedReportCards.map((c) => (
                    <div className="report-card-row-item" key={c.position_key}>
                      <div className="report-card-art-box">
                        {c.card_image_url ? (
                          <img
                            src={c.card_image_url}
                            alt={c.card_name}
                            className={`report-card-image ${c.orientation === 'reversed' ? 'reversed-art' : ''}`}
                            onError={(e) => {
                              // Fallback display card label only
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="art-placeholder">🎴</div>
                        )}
                      </div>
                      <div className="report-card-meaning-details">
                        <span className="pull-order-number">Slot {c.order_index}</span>
                        <h5>
                          {c.position_label} ➔ <strong className="card-name-highlight">{c.card_name}</strong>
                          <span className={`card-orientation-badge ${c.orientation}`}>
                            ({c.orientation.toUpperCase()})
                          </span>
                        </h5>
                        <p className="card-meaning-summary-text">{c.meaning_snapshot}</p>
                        {c.notes && (
                          <div className="card-reader-custom-notes">
                            <strong>Reader insights:</strong> <em>"{c.notes}"</em>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="report-divider" />

              {/* Live Interpretation Content Display */}
              <div className="report-interpretation-essay-area">
                <div className="report-essay-body" style={{ whiteSpace: 'pre-wrap' }}>
                  {interpretation}
                </div>
              </div>

              {/* Star Rating Selectors & Save/Discard controls */}
              <div className="report-footer-actions no-print panel stack">
                <div className="rating-select-group">
                  <label>Journal Rating</label>
                  <div className="star-rating-chips">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        type="button"
                        key={stars}
                        className={`star-chip-btn ${rating >= stars ? 'selected' : ''}`}
                        onClick={() => setRating(stars)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="step-actions vertical-actions">
                  <button type="button" className="primary save-btn" onClick={handleFinalizeSave}>
                    ✓ Save to Journal
                  </button>
                  <button type="button" className="secondary retry-analysis-btn" onClick={handleRegenerateInterpretation}>
                    🔄 Regenerate Interpretation
                  </button>
                  <button type="button" className="danger discard-btn" onClick={handleDiscard}>
                    ✕ Discard Reading
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 7: Success Screen */}
      {step === 7 && (
        <div className="flow-step step-success-journal panel stack text-center no-print">
          <div className="success-icon-banner">✅</div>
          <h2>Saved to Journal!</h2>
          <p className="step-guide">
            Your reading has been successfully recorded in your history logs.
          </p>

          <div className="success-action-buttons stack">
            <button
              type="button"
              className="primary"
              onClick={() => {
                onNavigateTab('history');
                resetState();
              }}
            >
              View Journal History
            </button>
            <button
              type="button"
              className="secondary"
              onClick={resetState}
            >
              New Reading
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onNavigateTab('draw');
                resetState();
              }}
            >
              Back to Home
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
