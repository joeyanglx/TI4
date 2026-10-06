import {
  FACTIONS,
  effectiveHitsOn,
  pieceUnitStats,
  stackSize,
  type DiceRoll,
  type GameState,
  type Piece,
} from '@ti4/shared';
import { PlayerTag } from './cardParts';

/** Stats panel for the unit under the mouse: its owner's faction unit, upgraded if researched. */
export function UnitCard({ piece, state }: { piece: Piece; state: GameState }) {
  const stats = pieceUnitStats(state, piece);
  if (!stats) return null;
  const { unit, owner, faction, upgradedBy, combatModifier } = stats;
  const count = stackSize(piece);

  const rows: [string, string][] = [];
  if (unit.cost !== undefined) rows.push(['Cost', unit.cost === 0.5 ? '1 for 2' : String(unit.cost)]);
  if (unit.combat) rows.push(['Combat', roll(unit.combat, combatModifier?.amount)]);
  if (unit.move !== undefined) rows.push(['Move', String(unit.move)]);
  if (unit.capacity !== undefined) rows.push(['Capacity', String(unit.capacity)]);
  if (unit.production) rows.push(['Production', unit.production.replace('resources', 'Resources')]);

  const abilities = [
    unit.sustainDamage && 'Sustain damage',
    unit.planetaryShield && 'Planetary shield',
    unit.bombardment && `Bombardment ${roll(unit.bombardment)}`,
    unit.antiFighterBarrage && `Anti-fighter barrage ${roll(unit.antiFighterBarrage)}`,
    unit.spaceCannon && `Space cannon ${roll(unit.spaceCannon)}${unit.spaceCannon.deepSpace ? ' (deep space)' : ''}`,
  ].filter(Boolean);

  return (
    <div className="system-card unit-card">
      <div className="system-card-title">
        {unit.name}
        {count > 1 && <span>×{count}{piece.damaged ? `, ${piece.damaged} damaged` : ''}</span>}
      </div>
      {owner ? (
        <div className="faction">
          <PlayerTag player={owner} state={state} />
          {faction && ` · ${FACTIONS[faction]?.name ?? faction}`}
        </div>
      ) : (
        <div className="faction">No player has this colour: generic unit</div>
      )}
      <div className="unit-stats">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {combatModifier && unit.combat && (
        <div className="unit-note">
          {combatModifier.source}: {combatModifier.amount > 0 ? '+' : '−'}
          {Math.abs(combatModifier.amount)} to combat rolls (printed {unit.combat.hitsOn})
        </div>
      )}
      {abilities.length > 0 && <div className="unit-abilities">{abilities.join(' · ')}</div>}
      {unit.ability && <div className="ability">{unit.ability}</div>}
      {upgradedBy && (
        <div className="unit-note">{upgradedBy === unit.name ? 'Upgraded' : `Upgraded by ${upgradedBy}`}</div>
      )}
    </div>
  );
}

/** "9", or "3 ×3" for several dice. */
function roll({ hitsOn, dice }: DiceRoll, modifier?: number): string {
  const value = effectiveHitsOn(hitsOn, modifier);
  return dice > 1 ? `${value} ×${dice}` : String(value);
}
