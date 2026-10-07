import { ROLL_KINDS, isHit, rollHits, type GameState, type Roll } from '@ti4/shared';
import { PlayerTag } from './cardParts';

/** Misses in a roll, for offering a re-roll. */
export function rollMisses(roll: Roll): number {
  return roll.groups.reduce((n, g) => n + g.results.filter((r) => !isHit(r, g.hitsOn, g.modifier)).length, 0);
}

/** One roll: who rolled what, each unit's dice coloured hit or miss, and the hit total. */
export function RollEntry({ roll, state, onRerollMisses }: { roll: Roll; state: GameState; onRerollMisses?: () => void }) {
  const hits = rollHits(roll);
  const misses = rollMisses(roll);
  const label = ROLL_KINDS.find((k) => k.kind === roll.kind)?.label;
  return (
    <div className="roll-entry">
      <div className="roll-head">
        <PlayerTag player={roll.player} state={state} />
        <span className="muted">
          {label}
          {roll.rerollOf && ' · re-roll'}
          {roll.ability && ` · ${roll.ability.source} ${roll.ability.amount > 0 ? '+' : '−'}${Math.abs(roll.ability.amount)}`}
        </span>
        <span className="roll-hits">
          {hits} {hits === 1 ? 'hit' : 'hits'}
        </span>
      </div>
      {roll.groups.map((g, i) => (
        <div key={i} className="roll-group">
          <span className="roll-unit">
            {g.unit}{' '}
            <span className="muted">
              ({g.hitsOn}+{g.modifier ? `, ${formatModifier(g.modifier)}` : ''})
            </span>
          </span>
          <span className="dice">
            {g.results.map((r, j) => (
              <span key={j} className={`die ${isHit(r, g.hitsOn, g.modifier) ? 'hit' : 'miss'}`}>
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

export function formatModifier(modifier: number): string {
  return modifier > 0 ? `+${modifier}` : `−${Math.abs(modifier)}`;
}
