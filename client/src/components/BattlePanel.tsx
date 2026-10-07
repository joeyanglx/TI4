import { useState } from 'react';
import {
  BATTLE_ROLLS,
  BATTLE_SIDES,
  ROLL_KINDS,
  effectiveHitsOn,
  fightsIn,
  hasRolled,
  hitsToAssign,
  isCombatRoll,
  isHit,
  pieceUnitStats,
  sideHits,
  spaceCannonsAt,
  unitRoll,
  type Action,
  type Battle,
  type BattleSideId,
  type BattleUnit,
  type GameState,
  type Piece,
  type Roll,
  type RollKind,
  type UnitStats,
} from '@ti4/shared';
import { d10s } from '../dice';
import { newId } from '../id';
import { systemName } from '../tiles';
import { PlayerTag } from './cardParts';
import { RollEntry, formatModifier } from './RollEntry';

interface Props {
  state: GameState;
  me: string;
  dispatch: (action: Action) => void;
}

/**
 * The battle being resolved, shown to every player. Each side rolls, assigns the hits the other side
 * scored (sustain damage or destroy), and when the battle ends the losses are written back to the board.
 */
export function BattlePanel({ state, me, dispatch }: Props) {
  const battle = state.battle!;
  const [minimized, setMinimized] = useState(false);
  const title = battle.cannonOnly
    ? `Space cannon offense · ${systemName(state, battle.system)}`
    : battle.kind === 'space'
      ? `Space combat · ${systemName(state, battle.system)}`
      : `Ground combat · ${battle.planet ?? systemName(state, battle.system)}`;

  if (minimized) {
    return (
      <button className="battle-bar" onClick={() => setMinimized(false)}>
        ⚔ {title}
        {!battle.cannonOnly && ` · round ${battle.round}`} — open
      </button>
    );
  }

  const anyRolls = battle.attacker.rolls.length > 0 || battle.defender.rolls.length > 0;
  const unassigned = BATTLE_SIDES.reduce((n, side) => n + hitsToAssign(battle, side), 0);
  // A space cannon offense attacker never had ships here, so it can't be eliminated.
  const eliminated = BATTLE_SIDES.filter(
    (side) =>
      !(battle.cannonOnly && side === 'attacker') &&
      !battle[side].units.some((u) => u.count > 0 && fightsIn(u.kind, battle.kind)),
  );

  return (
    <div className="battle-overlay">
      <div className="battle-panel" role="dialog" aria-label={title}>
        <header className="battle-header">
          <h2>
            ⚔ {title} {!battle.cannonOnly && <span className="muted">· round {battle.round}</span>}
          </h2>
          {!battle.cannonOnly && (
            <button disabled={anyRolls} title="Only before anyone has rolled" onClick={() => dispatch({ type: 'battle/swap' })}>
              Swap sides
            </button>
          )}
          <button onClick={() => setMinimized(true)}>Minimize</button>
        </header>

        <div className="battle-sides">
          {BATTLE_SIDES.map((side) => (
            <SideColumn key={side} battle={battle} side={side} state={state} me={me} dispatch={dispatch} />
          ))}
        </div>

        <footer className="battle-footer">
          <div className="battle-status">
            {battle.pastRounds.map((r, i) => (
              <span key={i} className="muted">
                Round {i + 1}: {r.attacker}–{r.defender}
              </span>
            ))}
            {eliminated.length > 0 && (
              <b>
                {eliminated.map((s) => `${battle[s].color} (${s})`).join(' and ')} {eliminated.length > 1 ? 'have' : 'has'} no{' '}
                {battle.kind === 'space' ? 'ships' : 'ground forces'} left.
              </b>
            )}
            {unassigned > 0 && <span className="warn">{unassigned} hit{unassigned === 1 ? '' : 's'} still to assign</span>}
          </div>
          <div className="row">
            {!battle.cannonOnly && (
              <button disabled={!anyRolls || unassigned > 0} onClick={() => dispatch({ type: 'battle/nextRound' })}>
                Next round
              </button>
            )}
            <button className="primary" onClick={() => dispatch({ type: 'battle/end', apply: true })}>
              End battle &amp; apply
            </button>
            <button className="danger" onClick={() => dispatch({ type: 'battle/end', apply: false })}>
              Cancel battle
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

interface SideProps {
  battle: Battle;
  side: BattleSideId;
  state: GameState;
  me: string;
  dispatch: (action: Action) => void;
}

function SideColumn({ battle, side, state, me, dispatch }: SideProps) {
  const { color, units, rolls, hitsTaken, hitsSkipped = 0 } = battle[side];
  const [chosenKind, setKind] = useState<RollKind>(BATTLE_ROLLS[battle.kind][0]);
  // Per unit type and roll type, so a +1 for dreadnoughts in combat doesn't carry over to their bombardment.
  const [modifiers, setModifiers] = useState<Record<string, number>>({});

  const rows = units.map((unit) => ({ unit, stats: statsFor(state, unit, color) }));
  const owner = rows.find((r) => r.stats?.owner)?.stats?.owner;
  const mine = owner === me;
  const adjacent = (spaceCannonsAt(state, battle.system).get(color) ?? []).filter((c) => c.adjacent);
  // In space cannon offense only the attacker rolls, and only space cannon; the defender just takes hits.
  const rollKinds = battle.cannonOnly ? (side === 'attacker' ? ['spaceCannon' as const] : []) : BATTLE_ROLLS[battle.kind];
  const available = rollKinds.filter(
    (k) => rows.some((r) => r.stats && unitRoll(r.stats.unit, k)) || (k === 'spaceCannon' && adjacent.length > 0),
  );
  const kind = available.includes(chosenKind) ? chosenKind : (available[0] ?? chosenKind);
  const ability = isCombatRoll(kind) ? rows.find((r) => r.stats?.combatModifier)?.stats?.combatModifier : undefined;
  const modifierOf = (unit: string) => modifiers[`${kind}|${unit}`] ?? 0;
  const changeModifier = (unit: string, amount: number) =>
    setModifiers((m) => ({ ...m, [`${kind}|${unit}`]: (m[`${kind}|${unit}`] ?? 0) + amount }));

  // Who rolls for the chosen roll type, with faction combat modifiers folded into the hit value.
  const rollers = rows
    .filter(({ unit }) => unit.count > 0)
    .map(({ unit, stats }) => {
      const stat = stats && unitRoll(stats.unit, kind);
      return stat && { name: stats.unit.name, hitsOn: effectiveHitsOn(stat.hitsOn, ability?.amount), dice: unit.count * stat.dice };
    })
    .filter((r) => !!r);
  if (kind === 'spaceCannon') {
    for (const { piece, stats } of adjacent) {
      const stat = stats.unit.spaceCannon!;
      rollers.push({ name: `${stats.unit.name} (adjacent)`, hitsOn: stat.hitsOn, dice: (piece.count ?? 1) * stat.dice });
    }
  }
  const totalDice = rollers.reduce((n, r) => n + r.dice, 0);
  const rolled = hasRolled(battle[side], kind);
  const kindLabel = ROLL_KINDS.find((r) => r.kind === kind)?.label.toLowerCase();
  const toAssign = hitsToAssign(battle, side);

  function roll() {
    const groups = rollers.map((r) => ({ unit: r.name, hitsOn: r.hitsOn, modifier: modifierOf(r.name), results: d10s(r.dice) }));
    if (!groups.length) return;
    dispatch({ type: 'battle/roll', side, roll: { id: newId(), player: me, kind, groups, ability } });
  }

  function reroll(previous: Roll) {
    const groups = previous.groups
      .map((g) => ({ ...g, results: d10s(g.results.filter((r) => !isHit(r, g.hitsOn, g.modifier)).length) }))
      .filter((g) => g.results.length);
    dispatch({ type: 'battle/roll', side, roll: { ...previous, id: newId(), player: me, groups, rerollOf: previous.id } });
  }

  return (
    <section className={`battle-side ${mine ? 'mine' : ''}`}>
      <div className="battle-side-head">
        <span className="side-label">{side}</span>
        {owner ? <PlayerTag player={owner} state={state} /> : <span className="muted">{color} (no player)</span>}
        <span className="roll-hits">
          {sideHits(battle[side])} hit{sideHits(battle[side]) === 1 ? '' : 's'}
        </span>
      </div>

      <table className="battle-units">
        <thead>
          <tr>
            <th>Unit</th>
            <th title={`Hit value for ${kindLabel}, after modifiers`}>Hits on</th>
            <th title={`Added to each of this unit's ${kindLabel} dice`}>Mod</th>
            <th>Left</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows
            .filter(({ unit, stats }) => fightsIn(unit.kind, battle.kind) || (stats && available.some((k) => unitRoll(stats.unit, k))))
            .map(({ unit, stats }) => {
              const fights = fightsIn(unit.kind, battle.kind);
              const canSustain = !!stats?.unit.sustainDamage && unit.damaged < unit.count;
              const stat = stats && unitRoll(stats.unit, kind);
              return (
                <tr key={unit.piece} className={unit.count === 0 ? 'destroyed' : fights ? '' : 'support'}>
                  <td>
                    {stats?.unit.name ?? unit.kind}
                    {!fights && <span className="muted"> (support)</span>}
                  </td>
                  <td className="muted">
                    {stat
                      ? hitValue(effectiveHitsOn(stat.hitsOn, (ability?.amount ?? 0) + modifierOf(stats.unit.name)), stat.dice)
                      : '–'}
                  </td>
                  <td>
                    {stat && unit.count > 0 && (
                      <ModifierCounter value={modifierOf(stats.unit.name)} onChange={(n) => changeModifier(stats.unit.name, n)} />
                    )}
                  </td>
                  <td>
                    {unit.count}
                    {unit.damaged > 0 && <span className="damaged"> · {unit.damaged} damaged</span>}
                  </td>
                  <td className="hit-buttons">
                    {unit.damaged > 0 && unit.count > 0 && (
                      <button
                        title="Repair one damaged unit (e.g. Duranium Armor)"
                        onClick={() => dispatch({ type: 'battle/repair', side, piece: unit.piece })}
                      >
                        Repair
                      </button>
                    )}
                    {fights && unit.count > 0 && (
                      <>
                        <button
                          disabled={!toAssign || !canSustain}
                          title={stats?.unit.sustainDamage ? 'Sustain damage' : 'This unit cannot sustain damage'}
                          onClick={() => dispatch({ type: 'battle/hit', side, piece: unit.piece, hit: 'sustain' })}
                        >
                          Sustain
                        </button>
                        <button
                          disabled={!toAssign}
                          onClick={() => dispatch({ type: 'battle/hit', side, piece: unit.piece, hit: 'destroy' })}
                        >
                          Destroy
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          {kind === 'spaceCannon' &&
            adjacent.map(({ piece, stats }) => {
              const name = `${stats.unit.name} (adjacent)`;
              const cannon = stats.unit.spaceCannon!;
              return (
                <tr key={piece.id} className="support">
                  <td>
                    {stats.unit.name} <span className="muted">(adjacent, deep space)</span>
                  </td>
                  <td className="muted">{hitValue(effectiveHitsOn(cannon.hitsOn, modifierOf(name)), cannon.dice)}</td>
                  <td>
                    <ModifierCounter value={modifierOf(name)} onChange={(n) => changeModifier(name, n)} />
                  </td>
                  <td>{piece.count ?? 1}</td>
                  <td />
                </tr>
              );
            })}
        </tbody>
      </table>

      <div className={`assign ${toAssign ? 'pending' : ''}`}>
        {toAssign > 0
          ? `Assign ${toAssign} hit${toAssign === 1 ? '' : 's'} from the ${side === 'attacker' ? 'defender' : 'attacker'}`
          : hitsTaken > 0
            ? `${hitsTaken} hit${hitsTaken === 1 ? '' : 's'} assigned${hitsSkipped ? ` (${hitsSkipped} skipped)` : ''}`
            : 'No hits to assign'}
        {toAssign > 0 && (
          <button
            className="link"
            title="Leave the remaining hits unassigned, e.g. cancelled by an ability or no valid target"
            onClick={() => dispatch({ type: 'battle/skipHits', side })}
          >
            Skip
          </button>
        )}
        {(hitsTaken > 0 || unitsChanged(units, battle[side].roundStart)) && (
          <button
            className="link"
            title="Undo this round's hits, skips and repairs on this side"
            onClick={() => dispatch({ type: 'battle/undoHits', side })}
          >
            Undo
          </button>
        )}
      </div>

      {available.length === 0 && (
        <p className="hint">{battle.cannonOnly ? 'Only the attacker fires in space cannon offense.' : 'No units here can roll.'}</p>
      )}
      {available.length > 0 && (
        <>
          <div className="filters">
            {available.map((k) => (
              <button key={k} className={`chip ${kind === k ? 'selected' : ''}`} onClick={() => setKind(k)}>
                {ROLL_KINDS.find((r) => r.kind === k)?.label}
              </button>
            ))}
          </div>
          <p className="hint">
            Mod is added to that unit type's dice
            {kind === 'spaceCannon' ? ' (e.g. −1 against Antimass Deflectors)' : ''}.
            {ability && ` ${ability.source} ${formatModifier(ability.amount)} is already in the hit values.`}
          </p>
          <button className="primary" disabled={!totalDice || rolled} onClick={roll}>
            {rolled
              ? `Rolled ${kindLabel} this round`
              : `Roll ${kindLabel} · ${totalDice} ${totalDice === 1 ? 'die' : 'dice'}`}
          </button>
        </>
      )}

      {[...rolls].reverse().map((r, i) => (
        <RollEntry key={r.id} roll={r} state={state} onRerollMisses={i === 0 ? () => reroll(r) : undefined} />
      ))}
    </section>
  );
}

/** Whether hits or repairs have changed a side's units since the round started. */
function unitsChanged(units: BattleUnit[], roundStart: BattleUnit[]): boolean {
  return units.some((u, i) => u.count !== roundStart[i]?.count || u.damaged !== roundStart[i]?.damaged);
}

function hitValue(hitsOn: number, dice: number): string {
  return `${hitsOn}+${dice > 1 ? ` ×${dice}` : ''}`;
}

function ModifierCounter({ value, onChange }: { value: number; onChange: (amount: number) => void }) {
  return (
    <span className="counter mod-counter">
      <button onClick={() => onChange(-1)}>−</button>
      <b className={value ? 'set' : ''}>{value ? formatModifier(value) : '0'}</b>
      <button onClick={() => onChange(1)}>+</button>
    </span>
  );
}

/** A battle stack's unit as its owner has it: faction unit, upgrades, always-on modifiers. */
function statsFor(state: GameState, unit: BattleUnit, color: Piece['color']): UnitStats | undefined {
  return pieceUnitStats(state, { id: unit.piece, kind: unit.kind, color, x: 0, y: 0 });
}
