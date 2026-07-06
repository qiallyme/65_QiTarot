import { useMemo, useState } from 'react';
import { SpreadDiagram } from './SpreadDiagram';
import type { Orientation, Person, ReadingCardInput, ReadingInput, SpreadPosition, SpreadTemplate, TarotCard } from '../types';
import { buildInterpretationPrompt } from '../lib/aiPrompt';

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

export function ReadingEditor({
  spread,
  cardCatalog,
  people,
  onSave,
  saving
}: {
  spread: SpreadTemplate;
  cardCatalog: TarotCard[];
  people: Person[];
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
  const [selectedSlotKey, setSelectedSlotKey] = useState(spread.positions[0]?.key || '');
  const [cardQuery, setCardQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [cards, setCards] = useState<ReadingCardInput[]>(() => initialCards(spread));

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
      const matchesGroup =
        groupFilter === 'all' ||
        card.arcana === groupFilter ||
        card.suit === groupFilter;
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
      return matchesGroup && (!query || searchText.includes(query));
    });
  }, [cardCatalog, cardQuery, groupFilter]);

  const groupedCards = useMemo(() => {
    return filteredCards.reduce<Record<string, TarotCard[]>>((groups, card) => {
      const key = labelsForGroup(card);
      groups[key] = groups[key] || [];
      groups[key].push(card);
      return groups;
    }, {});
  }, [filteredCards]);

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

  const promptPayload = useMemo(() => buildInterpretationPrompt(readingInput, spread), [readingInput, spread]);

  function setCardAtPosition(positionKey: string, card: TarotCard) {
    const position = spreadPositionByKey.get(positionKey);
    if (!position) return;

    setCards((current) => {
      const existing = current.find((row) => row.position_key === positionKey);
      const orientation = existing?.orientation || 'upright';
      return current.map((row) => (row.position_key === positionKey ? cardInputFor(position, card, orientation) : row));
    });

    const currentIndex = spread.positions.findIndex((positionRow) => positionRow.key === positionKey);
    const nextEmpty = spread.positions.slice(currentIndex + 1).find((positionRow) => {
      const currentCard = cards.find((row) => row.position_key === positionRow.key);
      return !currentCard?.card_name;
    });
    if (nextEmpty) setSelectedSlotKey(nextEmpty.key);
  }

  function placeCard(card: TarotCard) {
    const targetKey = selectedSlotKey || cards.find((row) => !row.card_name)?.position_key || spread.positions[0]?.key;
    if (targetKey) setCardAtPosition(targetKey, card);
  }

  function toggleOrientation(positionKey: string) {
    setCards((current) =>
      current.map((row) => {
        if (row.position_key !== positionKey || !row.card_name) return row;
        const nextOrientation: Orientation = row.orientation === 'reversed' ? 'upright' : 'reversed';
        return {
          ...row,
          orientation: nextOrientation,
          meaning_snapshot: nextOrientation === 'reversed' ? row.meaning_reversed_snapshot : row.meaning_upright_snapshot
        };
      })
    );
    setSelectedSlotKey(positionKey);
  }

  function updateNotes(positionKey: string, notes: string) {
    setCards((current) => current.map((row) => (row.position_key === positionKey ? { ...row, notes } : row)));
  }

  return (
    <section className="panel stack">
      <div className="panel-heading">
        <p className="eyebrow">Step 2</p>
        <h2>Build the pull</h2>
      </div>

      <div className="form-grid">
        <label>
          Person / subject
          <input
            value={subjectName}
            list="qitarot-people"
            onChange={(event) => setSubjectName(event.target.value)}
            placeholder="Who or what this is about"
          />
        </label>
        <label>
          Reader
          <input value={readerName} onChange={(event) => setReaderName(event.target.value)} placeholder="Optional" />
        </label>
        <label className="wide">
          Question / situation
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What was asked before the pull?" />
        </label>
        <label>
          Tags
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="love, carryover, warning, work" />
        </label>
        <label>
          Spread photo
          <input type="file" accept="image/*" capture="environment" onChange={(event) => setPhoto(event.target.files?.[0])} />
        </label>
      </div>

      <datalist id="qitarot-people">
        {people.map((person) => (
          <option value={person.display_name} key={person.id} />
        ))}
      </datalist>

      <div className="reading-workbench">
        <aside className="catalog-panel">
          <div className="catalog-controls">
            <label>
              Search cards
              <input value={cardQuery} onChange={(event) => setCardQuery(event.target.value)} placeholder="Card, suit, keyword" />
            </label>
            <div className="segmented" aria-label="Card group filter">
              {['all', 'major', 'wands', 'cups', 'swords', 'pentacles'].map((filter) => (
                <button
                  type="button"
                  className={groupFilter === filter ? 'active' : ''}
                  key={filter}
                  onClick={() => setGroupFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-list">
            {Object.entries(groupedCards).map(([groupName, groupCards]) => (
              <div className="catalog-group" key={groupName}>
                <h3>{groupName}</h3>
                {groupCards.map((card) => (
                  <button
                    type="button"
                    className="catalog-card"
                    key={card.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('application/qitarot-card', card.id)}
                    onClick={() => placeCard(card)}
                  >
                    <img src={card.image_url} alt={card.name} loading="lazy" />
                    <span>
                      <strong>{card.name}</strong>
                      <small>{card.upright_keywords.slice(0, 3).join(' / ')}</small>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="spread-workspace">
          <SpreadDiagram
            spread={spread}
            placedCards={cards}
            selectedSlotKey={selectedSlotKey}
            onSelectSlot={setSelectedSlotKey}
            onCardDrop={(positionKey, cardId) => {
              const card = cardById.get(cardId);
              if (card) setCardAtPosition(positionKey, card);
            }}
            onToggleOrientation={toggleOrientation}
          />
        </div>
      </div>

      <div className="position-meanings">
        {cards.map((card) => (
          <article className={`meaning-row ${selectedSlotKey === card.position_key ? 'selected' : ''}`} key={card.position_key}>
            <button type="button" onClick={() => setSelectedSlotKey(card.position_key)}>
              <strong>{card.order_index}. {card.position_label}</strong>
              <span>{card.card_name || 'Select a card'}</span>
            </button>
            <div>
              <p>{card.meaning_snapshot || spreadPositionByKey.get(card.position_key)?.prompt}</p>
              <textarea
                value={card.notes || ''}
                onChange={(event) => updateNotes(card.position_key, event.target.value)}
                placeholder="Reader note or observed nuance"
              />
            </div>
          </article>
        ))}
      </div>

      <div className="form-grid">
        <label className="wide">
          Summary
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Plain-English summary" />
        </label>
        <label className="wide">
          Interpretation
          <textarea className="tall" value={interpretation} onChange={(event) => setInterpretation(event.target.value)} placeholder="AI or manual interpretation" />
        </label>
      </div>

      <details>
        <summary>AI prompt payload preview</summary>
        <pre>{JSON.stringify(promptPayload, null, 2)}</pre>
      </details>

      <button className="primary" disabled={saving} onClick={() => onSave(readingInput, photo)}>
        {saving ? 'Saving...' : 'Save reading'}
      </button>
    </section>
  );
}
