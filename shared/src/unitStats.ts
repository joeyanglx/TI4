import { TECHNOLOGIES, type UnitInfo } from './cards';
import { playerUnits } from './dice';
import type { Piece, GameState } from './state';

/**
 * Faction abilities that always change combat rolls. Conditional effects (Slipstream, Gravity Drive,
 * Plasma Scoring, Supercharge, Galvanize, action cards, ...) are left to the players.
 * These apply to combat rolls only, not to unit abilities like BOMBARDMENT or SPACE CANNON.
 */
const COMBAT_MODIFIERS: Record<string, CombatModifier> = {
  jolnar: { source: 'Fragile', amount: -1 },
  sardakk: { source: 'Unrelenting', amount: 1 },
};

export type CombatModifier = { source: string; amount: number };

/** The always-on modifier to a faction's combat rolls, if it has one. */
export function factionCombatModifier(faction: string | undefined): CombatModifier | undefined {
  return faction ? COMBAT_MODIFIERS[faction] : undefined;
}

export interface UnitStats {
  unit: UnitInfo;
  /** Player whose colour the piece is, if anyone has taken that colour. */
  owner?: string;
  faction?: string;
  /** Name of the researched technology that upgraded this unit. */
  upgradedBy?: string;
  /** Always-on modifier to combat rolls; `unit.combat` is the printed value. */
  combatModifier?: CombatModifier;
}

/** The unit a piece stands for, given its owner's faction, technologies and the game's edition. */
export function pieceUnitStats(state: GameState, piece: Piece): UnitStats | undefined {
  const [owner, seat] = Object.entries(state.seats).find(([, s]) => s.color === piece.color) ?? [];
  const unit = playerUnits(seat?.faction, seat?.technologies ?? [], state.cards.edition).find(
    (u) => u.type === piece.kind,
  );
  if (!unit) return undefined;
  return {
    unit,
    owner,
    faction: seat?.faction,
    upgradedBy: unit.requiredTech ? TECHNOLOGIES[unit.requiredTech]?.name : undefined,
    combatModifier: factionCombatModifier(seat?.faction),
  };
}

/** The roll needed to hit after a modifier: +1 to rolls means hitting on one lower. */
export function effectiveHitsOn(hitsOn: number, modifier = 0): number {
  return hitsOn - modifier;
}
