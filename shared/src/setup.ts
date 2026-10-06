import { hexesInRadius, hexKey } from './hex';
import { emptyState, type GameState } from './state';

/** A blank 6-player board: Mecatol Rex in the centre and three empty rings. */
export function defaultBoard(): GameState {
  const state = emptyState();
  for (const hex of hexesInRadius(3)) {
    const id = hexKey(hex);
    const isCenter = hex.q === 0 && hex.r === 0;
    state.tiles[id] = { id, ...hex, system: isCenter ? '18' : '' };
  }
  return state;
}
