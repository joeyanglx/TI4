import { adjacentSystems } from './adjacency';
import { hexKey, pixelToHex } from './hex';
import { UNIT_KINDS, type PlayerColor } from './pieces';
import type { GameState, Piece } from './state';
import { pieceUnitStats, type UnitStats } from './unitStats';

export interface CannonUnit {
  piece: Piece;
  stats: UnitStats;
  /** In an adjacent system, firing with deep space (e.g. PDS II). */
  adjacent: boolean;
  /** The wormhole type that makes the system adjacent, when it isn't a touching hex. */
  wormhole?: string;
}

/**
 * Units that can fire SPACE CANNON at ships in a system, by colour: any in the system, plus deep-space
 * ones in adjacent systems (touching hexes, or systems sharing a wormhole type).
 */
export function spaceCannonsAt(state: GameState, system: string): Map<PlayerColor, CannonUnit[]> {
  const neighbours = adjacentSystems(state, system);
  const byColor = new Map<PlayerColor, CannonUnit[]>();
  for (const piece of Object.values(state.pieces)) {
    if (!(UNIT_KINDS as readonly string[]).includes(piece.kind)) continue;
    const key = hexKey(pixelToHex(piece));
    const via = neighbours.get(key);
    const adjacent = !!via;
    if (key !== system && !adjacent) continue;
    const stats = pieceUnitStats(state, piece);
    const cannon = stats?.unit.spaceCannon;
    if (!stats || !cannon || (adjacent && !cannon.deepSpace)) continue;
    const units = byColor.get(piece.color) ?? [];
    units.push({ piece, stats, adjacent, ...(via?.wormhole && { wormhole: via.wormhole }) });
    byColor.set(piece.color, units);
  }
  return byColor;
}
