import { hexKey, hexNeighbors, type Hex } from './hex';
import type { GameState } from './state';
import { SYSTEMS } from './systems';

/**
 * Systems adjacent to one on the board, keyed by hexKey: touching hexes, plus systems that share a
 * wormhole type with it (alpha–alpha, beta–beta, ...), with the wormhole they're reached through.
 * Hyperlanes and faction abilities that change adjacency aren't followed.
 */
export function adjacentSystems(state: GameState, system: string): Map<string, { wormhole?: string }> {
  const adjacent = new Map<string, { wormhole?: string }>();
  for (const hex of hexNeighbors(parseHexKey(system))) adjacent.set(hexKey(hex), {});
  const wormholes = tileWormholes(state, system);
  if (wormholes.length) {
    for (const id of Object.keys(state.tiles)) {
      if (id === system || adjacent.has(id)) continue;
      const shared = tileWormholes(state, id).find((w) => wormholes.includes(w));
      if (shared) adjacent.set(id, { wormhole: shared });
    }
  }
  return adjacent;
}

function tileWormholes(state: GameState, id: string): string[] {
  const tile = state.tiles[id];
  return (tile && SYSTEMS[tile.system]?.wormholes) || [];
}

export function parseHexKey(key: string): Hex {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}
