import { useEffect, useRef, useState } from 'react';
import {
  createBattle,
  possibleBattles,
  type Action,
  type BattleKind,
  type GameState,
} from '@ti4/shared';
import { newId } from '../id';
import { SystemUnitsList, systemUnits } from './SystemUnits';

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
}

const KINDS: { kind: BattleKind; label: string }[] = [
  { kind: 'space', label: 'Space combat' },
  { kind: 'ground', label: 'Ground combat' },
];

/**
 * Right-click menu for a system: start a battle between two colours that have units there, or space cannon
 * offense from a colour with no ships here but SPACE CANNON in or next to the system (e.g. PDS II).
 */
export function SystemMenu({ state, system, planet, me, x, y, dispatch, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showUnits, setShowUnits] = useState(false);

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

  // Space combat is fought in the system; ground combat only on the planet that was right-clicked.
  const options = KINDS.flatMap(({ kind, label }) =>
    possibleBattles(state, system, kind, planet).map((option) => ({
      ...option,
      kind,
      label: option.cannonOnly ? 'Space cannon offense' : kind === 'ground' ? `${label} on ${planet}` : label,
    })),
  );

  const owner = planet ? state.planets[planet]?.owner : undefined;
  const units = systemUnits(state, system);
  const unitCount = [...units.values()].reduce(
    (n, { places }) => n + [...places.values()].reduce((m, lines) => m + [...lines.values()].reduce((k, l) => k + l.count, 0), 0),
    0,
  );

  return (
    <div className="piece-menu" ref={ref} style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()}>
      <button onClick={() => setShowUnits(!showUnits)}>
        {showUnits ? '▾' : '▸'} {showUnits ? 'Hide' : 'Show'} units in this system ({unitCount})
      </button>
      {showUnits && <SystemUnitsList units={units} />}
      {planet && (
        <>
          <div className="piece-menu-title piece-menu-section">{planet}</div>
          {owner && owner !== me && <div className="piece-menu-note">Controlled by {owner}.</div>}
          {owner === me ? (
            <button
              onClick={() => {
                dispatch({ type: 'planet/control', planet });
                onClose();
              }}
            >
              Give up control of {planet}
            </button>
          ) : (
            <button
              onClick={() => {
                dispatch({ type: 'planet/control', planet, player: me });
                onClose();
              }}
            >
              Take control of {planet}
            </button>
          )}
        </>
      )}
      <div className={`piece-menu-title ${planet ? 'piece-menu-section' : ''}`}>Initiate battle</div>
      {state.battle && <div className="piece-menu-note">A battle is already in progress.</div>}
      {!state.battle && options.length === 0 && (
        <div className="piece-menu-note">
          {planet
            ? `Two players need ships here (or one ships and the other space cannon in range), or ground forces on ${planet}.`
            : 'Two players need ships here, or one ships and the other space cannon in range. For ground combat, right-click a planet.'}
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
            {o.label}: {o.attacker} {o.cannonOnly ? 'fires at' : 'vs'} {o.defender}
          </button>
        ))}
    </div>
  );
}
