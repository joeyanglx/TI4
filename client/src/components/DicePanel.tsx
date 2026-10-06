import { useMemo, useState } from 'react';
import {
  ROLL_KINDS,
  SYSTEMS,
  hexKey,
  isHit,
  pixelToHex,
  playerUnits,
  rollHits,
  seatOf,
  stackSize,
  unitRoll,
  type Action,
  type GameState,
  type Roll,
  type RollKind,
} from '@ti4/shared';
import { newId } from '../id';
import { PlayerTag } from './cardParts';

interface Props {
  state: GameState;
  me: string;
  dispatch: (action: Action) => void;
}

/** One d10 per die. crypto.getRandomValues works over plain http too, unlike randomUUID. */
function d10s(count: number): number[] {
  const values = crypto.getRandomValues(new Uint32Array(count));
  return [...values].map((v) => 1 + (v % 10));
}

/**
 * Combat dice: pick a roll type and how many of each unit, roll, and everyone sees the result in the log.
 * Hit values come from your faction's units (upgraded where you've researched it) and can be overridden.
 */
export function DicePanel({ state, me, dispatch }: Props) {
  const seat = seatOf(state.seats, me);
  const [kind, setKind] = useState<RollKind>('space');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hitsOn, setHitsOn] = useState<Record<string, number>>({});
  const [modifier, setModifier] = useState(0);

  const units = playerUnits(seat.faction, seat.technologies, state.cards.edition)
    .map((unit) => ({ unit, roll: unitRoll(unit, kind) }))
    .filter((u) => u.roll);
  const systems = useMemo(() => systemsWithMyUnits(state, me), [state, me]);

  function fillFromSystem(key: string) {
    const next: Record<string, number> = {};
    for (const piece of systems.find((s) => s.key === key)?.pieces ?? []) {
      const match = units.find((u) => u.unit.type === piece.kind);
      if (match) next[match.unit.name] = (next[match.unit.name] ?? 0) + stackSize(piece);
    }
    setCounts(next);
  }

  function roll() {
    const groups = units
      .filter(({ unit }) => (counts[unit.name] ?? 0) > 0)
      .map(({ unit, roll }) => ({
        unit: unit.name,
        hitsOn: hitsOn[unit.name] ?? roll!.hitsOn,
        results: d10s((counts[unit.name] ?? 0) * roll!.dice),
      }));
    if (groups.length) dispatch({ type: 'dice/roll', roll: { id: newId(), player: me, kind, modifier, groups } });
  }

  const totalDice = units.reduce((n, { unit, roll }) => n + (counts[unit.name] ?? 0) * roll!.dice, 0);
  const log = [...state.rolls].reverse();
  const myLatest = log.find((r) => r.player === me);

  return (
    <div className="dice-panel">
      <section>
        <h2>Roll dice</h2>
        <div className="filters">
          {ROLL_KINDS.map((k) => (
            <button key={k.kind} className={`chip ${kind === k.kind ? 'selected' : ''}`} onClick={() => setKind(k.kind)}>
              {k.label}
            </button>
          ))}
        </div>
        {systems.length > 0 && (
          <select value="" onChange={(e) => e.target.value && fillFromSystem(e.target.value)}>
            <option value="">Count my units in a system…</option>
            {systems.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        <table className="dice-units">
          <thead>
            <tr>
              <th>Unit</th>
              <th title="Dice per unit">Dice</th>
              <th title="Hits on this or higher">Hits on</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {units.map(({ unit, roll: stat }) => {
              const count = counts[unit.name] ?? 0;
              const set = (n: number) => setCounts({ ...counts, [unit.name]: Math.max(0, n) });
              return (
                <tr key={unit.name} className={count ? 'active' : ''}>
                  <td>{unit.name}</td>
                  <td>×{stat!.dice}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={hitsOn[unit.name] ?? stat!.hitsOn}
                      onChange={(e) => setHitsOn({ ...hitsOn, [unit.name]: Number(e.target.value) || stat!.hitsOn })}
                    />
                  </td>
                  <td className="stepper">
                    <button onClick={() => set(count - 1)}>−</button>
                    <b>{count}</b>
                    <button onClick={() => set(count + 1)}>+</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {units.length === 0 && <p className="hint">None of your units roll for this.</p>}
        <div className="counter-row">
          <span>Modifier to each die</span>
          <span className="counter">
            <button onClick={() => setModifier(modifier - 1)}>−</button>
            <b>{modifier > 0 ? `+${modifier}` : modifier}</b>
            <button onClick={() => setModifier(modifier + 1)}>+</button>
          </span>
        </div>
        <div className="row">
          <button className="primary" disabled={!totalDice} onClick={roll}>
            Roll {totalDice} {totalDice === 1 ? 'die' : 'dice'}
          </button>
          <button onClick={() => setCounts({})}>Clear</button>
        </div>
      </section>

      <section>
        <h2>Roll log</h2>
        {log.length === 0 && <p className="hint">No rolls yet. Everyone at the table sees every roll here.</p>}
        {log.map((r) => (
          <RollEntry
            key={r.id}
            roll={r}
            state={state}
            onRerollMisses={r === myLatest ? () => rerollMisses(r, me, dispatch) : undefined}
          />
        ))}
      </section>
    </div>
  );
}

function RollEntry({ roll, state, onRerollMisses }: { roll: Roll; state: GameState; onRerollMisses?: () => void }) {
  const hits = rollHits(roll);
  const misses = roll.groups.reduce((n, g) => n + g.results.filter((r) => !isHit(r, g.hitsOn, roll.modifier)).length, 0);
  const label = ROLL_KINDS.find((k) => k.kind === roll.kind)?.label;
  return (
    <div className="roll-entry">
      <div className="roll-head">
        <PlayerTag player={roll.player} state={state} />
        <span className="muted">
          {label}
          {roll.rerollOf && ' · re-roll'}
          {roll.modifier !== 0 && ` · ${roll.modifier > 0 ? '+' : ''}${roll.modifier}`}
        </span>
        <span className="roll-hits">
          {hits} {hits === 1 ? 'hit' : 'hits'}
        </span>
      </div>
      {roll.groups.map((g, i) => (
        <div key={i} className="roll-group">
          <span className="roll-unit">
            {g.unit} <span className="muted">({g.hitsOn}+)</span>
          </span>
          <span className="dice">
            {g.results.map((r, j) => (
              <span key={j} className={`die ${isHit(r, g.hitsOn, roll.modifier) ? 'hit' : 'miss'}`}>
                {r}
              </span>
            ))}
          </span>
        </div>
      ))}
      {onRerollMisses && misses > 0 && (
        <button className="link" onClick={onRerollMisses}>
          Re-roll {misses} {misses === 1 ? 'miss' : 'misses'}
        </button>
      )}
    </div>
  );
}

function rerollMisses(roll: Roll, me: string, dispatch: Props['dispatch']) {
  const groups = roll.groups
    .map((g) => ({ ...g, results: d10s(g.results.filter((r) => !isHit(r, g.hitsOn, roll.modifier)).length) }))
    .filter((g) => g.results.length);
  dispatch({ type: 'dice/roll', roll: { ...roll, id: newId(), player: me, groups, rerollOf: roll.id } });
}

/** Systems (hexes) where you have units on the map, for filling in counts. */
function systemsWithMyUnits(state: GameState, me: string) {
  const color = seatOf(state.seats, me).color;
  const byHex = new Map<string, { key: string; label: string; pieces: GameState['pieces'][string][] }>();
  for (const piece of Object.values(state.pieces)) {
    if (piece.color !== color || ['command', 'control', 'speaker'].includes(piece.kind)) continue;
    const hex = pixelToHex(piece);
    const key = hexKey(hex);
    if (!byHex.has(key)) {
      const system = state.tiles[key]?.system;
      const planets = system ? SYSTEMS[system]?.planets.map((p) => p.name).join(', ') : '';
      byHex.set(key, { key, label: system ? `System ${system}${planets ? ` (${planets})` : ''}` : `Empty space ${key}`, pieces: [] });
    }
    byHex.get(key)!.pieces.push(piece);
  }
  return [...byHex.values()];
}
