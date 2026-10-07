import { hexKey, hexNeighbors, pixelToHex, type Hex } from './hex';
import { UNIT_KINDS, type PlayerColor } from './pieces';
import type { GameState, Piece } from './state';
import { pieceUnitStats, type UnitStats } from './unitStats';

export interface CannonUnit {
  piece: Piece;
  stats: UnitStats;
  /** In a neighbouring system, firing with deep space (e.g. PDS II). */
  adjacent: boolean;
}

/**
 * Units that can fire SPACE CANNON at ships in a system, by colour: any in the system, plus deep-space
 * ones in systems next to it. Adjacency is by touching hexes only; wormholes aren't followed.
 */
export function spaceCannonsAt(state: GameState, system: string): Map<PlayerColor, CannonUnit[]> {
  const neighbours = new Set(hexNeighbors(parseHexKey(system)).map(hexKey));
  const byColor = new Map<PlayerColor, CannonUnit[]>();
  for (const piece of Object.values(state.pieces)) {
    if (!(UNIT_KINDS as readonly string[]).includes(piece.kind)) continue;
    const key = hexKey(pixelToHex(piece));
    const adjacent = neighbours.has(key);
    if (key !== system && !adjacent) continue;
    const stats = pieceUnitStats(state, piece);
    const cannon = stats?.unit.spaceCannon;
    if (!stats || !cannon || (adjacent && !cannon.deepSpace)) continue;
    const units = byColor.get(piece.color) ?? [];
    units.push({ piece, stats, adjacent });
    byColor.set(piece.color, units);
  }
  return byColor;
}

function parseHexKey(key: string): Hex {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}
