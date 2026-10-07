import { useEffect, useRef } from 'react';
import {
  createBattle,
  possibleBattles,
  spaceCannonsAt,
  type Action,
  type BattleKind,
  type GameState,
  type PlayerColor,
} from '@ti4/shared';
import { newId } from '../id';

interface Props {
  state: GameState;
  /** hexKey of the system. */
  system: string;
  /** Planet under the mouse, if the right-click was inside a planet's circle. */
  planet?: string;
  me: string;
  /** Position inside the board, in CSS pixels. */
  x: number;
  y: number;
  dispatch: (action: Action) => void;
  onClose: () => void;
  /** Open the space cannon offense dialog for a colour firing at this system. */
  onSpaceCannon: (color: PlayerColor) => void;
}

const KINDS: { kind: BattleKind; label: string }[] = [
  { kind: 'space', label: 'Space combat' },
  { kind: 'ground', label: 'Ground combat' },
];

/** Right-click menu for a system: start a battle between two colours that have units there. */
export function SystemMenu({ state, system, planet, me, x, y, dispatch, onClose, onSpaceCannon }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const cannons = [...spaceCannonsAt(state, system)];
  // Space combat is fought in the system; ground combat only on the planet that was right-clicked.
  const options = KINDS.flatMap(({ kind, label }) =>
    possibleBattles(state, system, kind, planet).map(([attacker, defender]) => ({
      kind,
      label: kind === 'ground' ? `${label} on ${planet}` : label,
      attacker,
      defender,
    })),
  );

  return (
    <div className="piece-menu" ref={ref} style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()}>
      <div className="piece-menu-title">Initiate battle</div>
      {state.battle && <div className="piece-menu-note">A battle is already in progress.</div>}
      {!state.battle && options.length === 0 && (
        <div className="piece-menu-note">
          {planet
            ? `Two players need ships here, or ground forces on ${planet}.`
            : 'Two players need ships here. For ground combat, right-click a planet.'}
        </div>
      )}
      {!state.battle &&
        options.map((o) => (
          <button
            key={`${o.kind}-${o.attacker}-${o.defender}`}
            onClick={() => {
              const battle = createBattle(state, { id: newId(), system, planet, startedBy: me, ...o });
              dispatch({ type: 'battle/start', battle });
              onClose();
            }}
          >
            {o.label}: {o.attacker} vs {o.defender}
          </button>
        ))}
      <div className="piece-menu-title piece-menu-section">Space cannon offense</div>
      {cannons.length === 0 && <div className="piece-menu-note">No space cannon in or next to this system.</div>}
      {cannons.map(([color, units]) => {
        // Count units, not stacks: a stack of 2 PDS is 2 units.
        const total = units.reduce((n, u) => n + (u.piece.count ?? 1), 0);
        const adjacent = units.filter((u) => u.adjacent).reduce((n, u) => n + (u.piece.count ?? 1), 0);
        return (
          <button
            key={color}
            onClick={() => {
              onSpaceCannon(color);
              onClose();
            }}
          >
            {color}: {total} unit{total === 1 ? '' : 's'}
            {adjacent > 0 && <span className="muted"> ({adjacent} adjacent)</span>}
          </button>
        );
      })}
    </div>
  );
}
