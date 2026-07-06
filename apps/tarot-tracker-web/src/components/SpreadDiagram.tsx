import type { SpreadTemplate } from '../types';

export function SpreadDiagram({ spread }: { spread: SpreadTemplate }) {
  return (
    <div className="spread-diagram" aria-label={`${spread.name} diagram`}>
      {spread.positions.map((position) => (
        <div
          key={position.key}
          className="card-slot"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
          title={`${position.order}. ${position.label}: ${position.prompt}`}
        >
          <strong>{position.order}</strong>
          <span>{position.label}</span>
        </div>
      ))}
    </div>
  );
}
