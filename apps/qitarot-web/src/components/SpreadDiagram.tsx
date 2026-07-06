import type { ReadingCardInput, SpreadTemplate } from '../types';

export function SpreadDiagram({
  spread,
  placedCards,
  selectedSlotKey,
  onSelectSlot,
  onCardDrop,
  onToggleOrientation,
  backgroundImageUrl
}: {
  spread: SpreadTemplate;
  placedCards?: ReadingCardInput[];
  selectedSlotKey?: string;
  onSelectSlot?: (positionKey: string) => void;
  onCardDrop?: (positionKey: string, cardId: string) => void;
  onToggleOrientation?: (positionKey: string) => void;
  backgroundImageUrl?: string;
}) {
  const cardsByPosition = new Map((placedCards || []).map((card) => [card.position_key, card]));
  const style = backgroundImageUrl
    ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <div
      className={`spread-diagram ${backgroundImageUrl ? 'has-bg-overlay' : ''}`}
      style={style}
      aria-label={`${spread.name} diagram`}
    >
      {spread.positions.map((position) => {
        const card = cardsByPosition.get(position.key);
        const isInteractive = Boolean(onSelectSlot || onCardDrop || onToggleOrientation);
        return (
          <button
            type="button"
            key={position.key}
            className={`card-slot ${card?.card_name ? 'filled' : ''} ${card?.orientation === 'reversed' ? 'reversed' : ''} ${selectedSlotKey === position.key ? 'selected' : ''}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            title={`${position.order}. ${position.label}: ${position.prompt}`}
            disabled={!isInteractive}
            onClick={() => {
              if (card?.card_name && onToggleOrientation) onToggleOrientation(position.key);
              else onSelectSlot?.(position.key);
            }}
            onDragOver={(event) => {
              if (!onCardDrop) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              if (!onCardDrop) return;
              event.preventDefault();
              const cardId = event.dataTransfer.getData('application/qitarot-card');
              if (cardId) onCardDrop(position.key, cardId);
            }}
          >
            {card?.card_name ? (
              <>
                {card.card_image_url && <img src={card.card_image_url} alt={card.card_name} loading="lazy" />}
                <span>{card.card_name}</span>
              </>
            ) : (
              <>
                <strong>{position.order}</strong>
                <span>{position.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
