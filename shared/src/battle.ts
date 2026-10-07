import { rollHits, type Roll, type RollKind } from './dice';
import { hexKey, pixelToHex } from './hex';
import { UNIT_KINDS, type PieceKind, type PlayerColor } from './pieces';
import { planetAt } from './planets';
import { spaceCannonsAt } from './spaceCannon';
import type { GameState } from './state';

export type BattleKind = 'space' | 'ground';
export type BattleSideId = 'attacker' | 'defender';
export const BATTLE_SIDES: BattleSideId[] = ['attacker', 'defender'];

/** Roll types each kind of battle offers, combat first. */
export const BATTLE_ROLLS: Record<BattleKind, RollKind[]> = {
  space: ['space', 'antiFighterBarrage', 'spaceCannon'],
  ground: ['ground', 'bombardment', 'spaceCannon'],
};

const SHIPS: PieceKind[] = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];
const GROUND_FORCES: PieceKind[] = ['infantry', 'mech'];

/** Units that take part in (and can be hit in) this kind of battle: ships in space, ground forces on the ground. */
export function fightsIn(kind: PieceKind, battle: BattleKind): boolean {
  return (battle === 'space' ? SHIPS : GROUND_FORCES).includes(kind);
}

/** One stack from the board, as it stands in the battle. Board pieces only change when the battle ends. */
export interface BattleUnit {
  piece: string;
  kind: PieceKind;
  count: number;
  damaged: number;
}

export interface BattleSide {
  color: PlayerColor;
  units: BattleUnit[];
  /** Units at the start of this round, so a side can undo its hit assignments. */
  roundStart: BattleUnit[];
  /** This side's rolls this round, re-rolls included. */
  rolls: Roll[];
  /** Hits this side has assigned to its own units this round, skipped ones included. */
  hitsTaken: number;
  /** Hits this side chose not to assign this round (cancelled by an ability, no valid target, ...). */
  hitsSkipped?: number;
}

export interface Battle {
  id: string;
  /** hexKey of the system. */
  system: string;
  kind: BattleKind;
  /** Ground combat is fought on one planet. */
  planet?: string;
  round: number;
  startedBy: string;
  attacker: BattleSide;
  defender: BattleSide;
  /** Hits each side scored in earlier rounds, oldest first. */
  pastRounds: Record<BattleSideId, number>[];
  /**
   * Space cannon offense: the attacker has no ships in the system and fires SPACE CANNON (from units there
   * or deep-space units next to it, e.g. PDS II) at the defender's ships. One volley, no combat rounds.
   */
  cannonOnly?: boolean;
}

/** A battle that could be started in a system. */
export interface BattleOption {
  attacker: PlayerColor;
  defender: PlayerColor;
  cannonOnly?: boolean;
}

export type BattleAction =
  | { type: 'battle/start'; battle: Battle }
  /** Swap attacker and defender; only before anyone has rolled. */
  | { type: 'battle/swap' }
  /** A side's roll for one roll type this round, or a re-roll of its misses. */
  | { type: 'battle/roll'; side: BattleSideId; roll: Roll }
  /** Assign one hit to a unit on `side`: it sustains damage or one unit in the stack is destroyed. */
  | { type: 'battle/hit'; side: BattleSideId; piece: string; hit: 'sustain' | 'destroy' }
  /** Leave the rest of the hits scored against `side` unassigned this round. */
  | { type: 'battle/skipHits'; side: BattleSideId }
  /** Repair one damaged unit in a stack mid-battle, e.g. with Duranium Armor. */
  | { type: 'battle/repair'; side: BattleSideId; piece: string }
  /** Put `side`'s units back as they were at the start of the round: hits, skips and repairs. */
  | { type: 'battle/undoHits'; side: BattleSideId }
  | { type: 'battle/nextRound' }
  /** Finish the battle; `apply` writes losses and damage back to the board, otherwise nothing changes. */
  | { type: 'battle/end'; apply: boolean };

export function otherSide(side: BattleSideId): BattleSideId {
  return side === 'attacker' ? 'defender' : 'attacker';
}

/** Each roll type is rolled once per round per side; re-rolling misses doesn't count. */
export function hasRolled(side: BattleSide, kind: RollKind): boolean {
  return side.rolls.some((r) => r.kind === kind && !r.rerollOf);
}

/** Hits a side has rolled this round. */
export function sideHits(side: BattleSide): number {
  return side.rolls.reduce((sum, roll) => sum + rollHits(roll), 0);
}

/** Hits the opponent scored that this side still has to assign. */
export function hitsToAssign(battle: Battle, side: BattleSideId): number {
  return Math.max(0, sideHits(battle[otherSide(side)]) - battle[side].hitsTaken);
}

/**
 * Units of each colour in a system, as battle stacks. With a planet, only units on that planet count,
 * plus ships in the system (they can support with BOMBARDMENT).
 */
export function unitsInSystem(state: GameState, system: string, planet?: string): Map<PlayerColor, BattleUnit[]> {
  const byColor = new Map<PlayerColor, BattleUnit[]>();
  for (const piece of Object.values(state.pieces)) {
    if (!(UNIT_KINDS as readonly string[]).includes(piece.kind)) continue;
    if (hexKey(pixelToHex(piece)) !== system) continue;
    if (planet && !fightsIn(piece.kind, 'space') && planetAt(state, piece)?.planet.name !== planet) continue;
    const units = byColor.get(piece.color) ?? [];
    units.push({ piece: piece.id, kind: piece.kind, count: piece.count ?? 1, damaged: piece.damaged ?? 0 });
    byColor.set(piece.color, units);
  }
  return byColor;
}

/**
 * Battles that could be fought here: two colours that both have units that fight in it. Ground combat
 * needs a planet, and only ground forces placed on that planet count. In space, a colour with no ships
 * but SPACE CANNON in or next to the system can also fire at another colour's ships (cannon only).
 */
export function possibleBattles(state: GameState, system: string, kind: BattleKind, planet?: string): BattleOption[] {
  if (kind === 'ground' && !planet) return [];
  const colors = [...unitsInSystem(state, system, kind === 'ground' ? planet : undefined)]
    .filter(([, units]) => units.some((u) => fightsIn(u.kind, kind)))
    .map(([color]) => color);
  const options: BattleOption[] = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) options.push({ attacker: colors[i], defender: colors[j] });
  }
  if (kind === 'space') {
    for (const cannon of spaceCannonsAt(state, system).keys()) {
      if (colors.includes(cannon)) continue;
      for (const target of colors) options.push({ attacker: cannon, defender: target, cannonOnly: true });
    }
  }
  return options;
}

export function createBattle(
  state: GameState,
  options: {
    id: string;
    system: string;
    kind: BattleKind;
    planet?: string;
    attacker: PlayerColor;
    defender: PlayerColor;
    cannonOnly?: boolean;
    startedBy: string;
  },
): Battle {
  const planet = options.kind === 'ground' ? options.planet : undefined;
  const units = unitsInSystem(state, options.system, planet);
  const side = (color: PlayerColor): BattleSide => {
    const sideUnits = units.get(color) ?? [];
    return { color, units: sideUnits, roundStart: sideUnits, rolls: [], hitsTaken: 0 };
  };
  return {
    id: options.id,
    system: options.system,
    kind: options.kind,
    ...(planet && { planet }),
    round: 1,
    startedBy: options.startedBy,
    attacker: side(options.attacker),
    defender: side(options.defender),
    pastRounds: [],
    ...(options.kind === 'space' && options.cannonOnly && { cannonOnly: true }),
  };
}

export function applyBattleAction(state: GameState, action: BattleAction): GameState {
  if (action.type === 'battle/start') return state.battle ? state : { ...state, battle: action.battle };
  const battle = state.battle;
  if (!battle) return state;

  switch (action.type) {
    case 'battle/swap': {
      if (battle.cannonOnly || battle.attacker.rolls.length || battle.defender.rolls.length) return state;
      return { ...state, battle: { ...battle, attacker: battle.defender, defender: battle.attacker } };
    }
    case 'battle/roll': {
      const side = battle[action.side];
      if (battle.cannonOnly && (action.side !== 'attacker' || action.roll.kind !== 'spaceCannon')) return state;
      if (!action.roll.rerollOf && hasRolled(side, action.roll.kind)) return state;
      return withSide(state, battle, action.side, { ...side, rolls: [...side.rolls, action.roll] });
    }
    case 'battle/hit': {
      const side = battle[action.side];
      if (hitsToAssign(battle, action.side) <= 0) return state;
      const units = side.units.map((u) => {
        if (u.piece !== action.piece || u.count <= 0) return u;
        if (action.hit === 'sustain') return u.damaged < u.count ? { ...u, damaged: u.damaged + 1 } : u;
        // Destroy a damaged unit first: an undamaged one can still sustain damage later.
        return { ...u, count: u.count - 1, damaged: Math.max(0, Math.min(u.damaged - 1, u.count - 1)) };
      });
      return withSide(state, battle, action.side, { ...side, units, hitsTaken: side.hitsTaken + 1 });
    }
    case 'battle/skipHits': {
      const side = battle[action.side];
      const skipped = hitsToAssign(battle, action.side);
      if (skipped <= 0) return state;
      return withSide(state, battle, action.side, {
        ...side,
        hitsTaken: side.hitsTaken + skipped,
        hitsSkipped: (side.hitsSkipped ?? 0) + skipped,
      });
    }
    case 'battle/repair': {
      const side = battle[action.side];
      const units = side.units.map((u) =>
        u.piece === action.piece && u.count > 0 && u.damaged > 0 ? { ...u, damaged: u.damaged - 1 } : u,
      );
      return withSide(state, battle, action.side, { ...side, units });
    }
    case 'battle/undoHits': {
      const side = battle[action.side];
      return withSide(state, battle, action.side, { ...side, units: side.roundStart, hitsTaken: 0, hitsSkipped: 0 });
    }
    case 'battle/nextRound': {
      if (battle.cannonOnly) return state;
      const next = (side: BattleSide): BattleSide => ({ ...side, roundStart: side.units, rolls: [], hitsTaken: 0, hitsSkipped: 0 });
      return {
        ...state,
        battle: {
          ...battle,
          round: battle.round + 1,
          pastRounds: [...battle.pastRounds, { attacker: sideHits(battle.attacker), defender: sideHits(battle.defender) }],
          attacker: next(battle.attacker),
          defender: next(battle.defender),
        },
      };
    }
    case 'battle/end': {
      if (!action.apply) return { ...state, battle: undefined };
      const pieces = { ...state.pieces };
      for (const unit of [...battle.attacker.units, ...battle.defender.units]) {
        const piece = pieces[unit.piece];
        if (!piece) continue;
        if (unit.count <= 0) delete pieces[unit.piece];
        else pieces[unit.piece] = { ...piece, count: unit.count, damaged: unit.damaged };
      }
      return { ...state, pieces, battle: undefined };
    }
  }
}

function withSide(state: GameState, battle: Battle, id: BattleSideId, side: BattleSide): GameState {
  return { ...state, battle: { ...battle, [id]: side } };
}
