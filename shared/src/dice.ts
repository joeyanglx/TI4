import { FACTIONS, UNITS, inEdition, type DiceRoll, type Edition, type UnitInfo } from './cards';

/** The unit abilities that roll dice, plus plain combat, plus free rolls from the top bar (no hits). */
export type RollKind = 'space' | 'ground' | 'antiFighterBarrage' | 'spaceCannon' | 'bombardment' | 'free';

export const ROLL_KINDS: { kind: RollKind; label: string }[] = [
  { kind: 'space', label: 'Space combat' },
  { kind: 'ground', label: 'Ground combat' },
  { kind: 'antiFighterBarrage', label: 'Anti-fighter barrage' },
  { kind: 'spaceCannon', label: 'Space cannon' },
  { kind: 'bombardment', label: 'Bombardment' },
  { kind: 'free', label: 'Dice' },
];

/** Dice the top bar can roll. */
export const FREE_DICE = [4, 6, 10] as const;

export interface RollGroup {
  /** Unit name, e.g. "Dreadnought II". */
  unit: string;
  hitsOn: number;
  /** One result per die, 1 to `sides`. */
  results: number[];
  /** Faces on these dice; combat and unit abilities always use d10s. */
  sides?: number;
  /** Added to each of this unit's dice, e.g. +1 from Morale Boost or −1 against Antimass Deflectors. */
  modifier: number;
}

export interface Roll {
  id: string;
  player: string;
  kind: RollKind;
  groups: RollGroup[];
  /** Set when this re-rolls the misses of an earlier roll. */
  rerollOf?: string;
  /** Always-on faction ability already folded into each group's hitsOn, shown in the log (e.g. Unrelenting +1). */
  ability?: { source: string; amount: number };
}

export type DiceAction = { type: 'dice/roll'; roll: Roll };

/** How many rolls the shared log keeps. */
export const ROLL_LOG_SIZE = 30;

export function applyDiceAction(rolls: Roll[], action: DiceAction): Roll[] {
  return [...rolls, action.roll].slice(-ROLL_LOG_SIZE);
}

export function isHit(result: number, hitsOn: number, modifier: number): boolean {
  return result + modifier >= hitsOn;
}

export function rollHits(roll: Roll): number {
  if (roll.kind === 'free') return 0;
  return roll.groups.reduce(
    (sum, g) => sum + g.results.filter((r) => isHit(r, g.hitsOn, g.modifier)).length,
    0,
  );
}

/** Sum of every die, for free rolls. */
export function rollTotal(roll: Roll): number {
  return roll.groups.reduce((sum, g) => sum + g.results.reduce((a, b) => a + b, 0), 0);
}

/** "2 × D6: 3, 5 (total 8)" for a free roll. */
export function describeFreeRoll(roll: Roll): string {
  const dice = roll.groups.map((g) => `${g.results.length} × ${g.unit}: ${g.results.join(', ')}`).join('; ');
  const count = roll.groups.reduce((n, g) => n + g.results.length, 0);
  return count > 1 ? `${dice} (total ${rollTotal(roll)})` : dice;
}

/** Space and ground combat are "combat rolls"; unit abilities like BOMBARDMENT are not. */
export function isCombatRoll(kind: RollKind): boolean {
  return kind === 'space' || kind === 'ground';
}

/** Which of a unit's stats a roll uses. */
export function unitRoll(unit: UnitInfo, kind: RollKind): DiceRoll | undefined {
  switch (kind) {
    case 'space':
      return isShip(unit) ? unit.combat : undefined;
    case 'ground':
      return isShip(unit) ? undefined : unit.combat;
    case 'antiFighterBarrage':
      return unit.antiFighterBarrage;
    case 'spaceCannon':
      return unit.spaceCannon;
    case 'bombardment':
      return unit.bombardment;
    case 'free':
      return undefined;
  }
}

const SHIP_TYPES = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];
const GENERIC_UNITS = ['warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'infantry', 'pds', 'spacedock'];

function isShip(unit: UnitInfo) {
  return SHIP_TYPES.includes(unit.type);
}

/**
 * A player's units as they stand: their faction's units (or the generic ones without a faction),
 * upgraded where they've researched the upgrade, limited to the game's edition.
 */
export function playerUnits(faction: string | undefined, technologies: string[], edition: Edition): UnitInfo[] {
  const ids = (faction && FACTIONS[faction]?.units) || GENERIC_UNITS;
  return ids
    .map((id) => {
      const unit = UNITS[id];
      const upgrade = unit?.upgrade ? UNITS[unit.upgrade] : undefined;
      return upgrade?.requiredTech && technologies.includes(upgrade.requiredTech) ? upgrade : unit;
    })
    .filter((u): u is UnitInfo => !!u && inEdition(u.expansion, edition));
}
