import { useState } from 'react';
import { PLAYER_COLORS, spaceCannonsAt, type Action, type GameState, type PlayerColor, type Roll } from '@ti4/shared';
import { d10s } from '../dice';
import { newId } from '../id';
import { systemName } from '../tiles';
import { RollEntry } from './RollEntry';

interface Props {
  state: GameState;
  me: string;
  /** hexKey of the system being fired at. */
  system: string;
  color: PlayerColor;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

/**
 * Space cannon offense outside a battle: one colour's units in the system, plus deep-space units next to it,
 * fire at ships in the system. The roll goes in the shared log; hits are applied to pieces by hand.
 */
export function SpaceCannonDialog({ state, me, system, color, dispatch, onClose }: Props) {
  const [modifier, setModifier] = useState(0);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const units = spaceCannonsAt(state, system).get(color) ?? [];
  const target = systemName(state, system);
  const totalDice = units.reduce((n, u) => n + (u.piece.count ?? 1) * u.stats.unit.spaceCannon!.dice, 0);
  const owner = units.find((u) => u.stats.owner)?.stats.owner;

  function send(roll: Roll) {
    dispatch({ type: 'dice/roll', roll });
    setRolls([roll, ...rolls]);
  }

  function roll() {
    const groups = units.map(({ piece, stats, adjacent }) => {
      const cannon = stats.unit.spaceCannon!;
      return {
        unit: adjacent ? `${stats.unit.name} (adjacent)` : stats.unit.name,
        hitsOn: cannon.hitsOn,
        results: d10s((piece.count ?? 1) * cannon.dice),
      };
    });
    send({ id: newId(), player: me, kind: 'spaceCannon', modifier, groups, target });
  }

  function reroll(previous: Roll) {
    const groups = previous.groups
      .map((g) => ({ ...g, results: d10s(g.results.filter((r) => r + previous.modifier < g.hitsOn).length) }))
      .filter((g) => g.results.length);
    send({ ...previous, id: newId(), player: me, groups, rerollOf: previous.id });
  }

  return (
    <div className="battle-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="battle-panel cannon-panel" role="dialog" aria-label="Space cannon offense">
        <header className="battle-header">
          <h2>
            Space cannon offense <span className="muted">· at {target}</span>
          </h2>
          <button onClick={onClose}>Close</button>
        </header>
        <section className="battle-side">
          <div className="battle-side-head">
            <span className="player-dot" style={{ background: PLAYER_COLORS[color] }} />
            <b>{owner ?? color}</b>
          </div>
          <table className="battle-units">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Where</th>
                <th>Hits on</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {units.map(({ piece, stats, adjacent }) => (
                <tr key={piece.id}>
                  <td>{stats.unit.name}</td>
                  <td className="muted">{adjacent ? 'Adjacent (deep space)' : 'In system'}</td>
                  <td>
                    {stats.unit.spaceCannon!.hitsOn}+{stats.unit.spaceCannon!.dice > 1 ? ` ×${stats.unit.spaceCannon!.dice}` : ''}
                  </td>
                  <td>{piece.count ?? 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="counter-row">
            <span>
              Modifier to each die <span className="muted">(e.g. −1 against Antimass Deflectors)</span>
            </span>
            <span className="counter">
              <button onClick={() => setModifier(modifier - 1)}>−</button>
              <b>{modifier > 0 ? `+${modifier}` : modifier}</b>
              <button onClick={() => setModifier(modifier + 1)}>+</button>
            </span>
          </div>
          <button className="primary" disabled={!totalDice || rolls.length > 0} onClick={roll}>
            {rolls.length ? 'Rolled' : `Roll space cannon · ${totalDice} ${totalDice === 1 ? 'die' : 'dice'}`}
          </button>
          {rolls.map((r, i) => (
            <RollEntry key={r.id} roll={r} state={state} onRerollMisses={i === 0 ? () => reroll(r) : undefined} />
          ))}
          {rolls.length > 0 && (
            <p className="hint">Hits go on ships in the system: use the piece menu (right-click) to destroy or damage them.</p>
          )}
        </section>
      </div>
    </div>
  );
}
