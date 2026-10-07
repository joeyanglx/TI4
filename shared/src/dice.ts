import { FACTIONS, UNITS, inEdition, type DiceRoll, type Edition, type UnitInfo } from './cards';

/** The unit abilities that roll dice, plus plain combat. */
export type RollKind = 'space' | 'ground' | 'antiFighterBarrage' | 'spaceCannon' | 'bombardment';

export const ROLL_KINDS: { kind: RollKind; label: string }[] = [
  { kind: 'space', label: 'Space combat' },
  { kind: 'ground', label: 'Ground combat' },
  { kind: 'antiFighterBarrage', label: 'Anti-fighter barrage' },
  { kind: 'spaceCannon', label: 'Space cannon' },
  { kind: 'bombardment', label: 'Bombardment' },
];

export interface RollGroup {
  /** Unit name, e.g. "Dreadnought II". */
  unit: string;
  hitsOn: number;
  /** One result (1-10) per die. */
  results: number[];
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
  return roll.groups.reduce(
    (sum, g) => sum + g.results.filter((r) => isHit(r, g.hitsOn, g.modifier)).length,
    0,
  );
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
