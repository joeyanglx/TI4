import { emptyState, makeTile, type GameState } from './state';
import { MECATOL_REX } from './systems';

/** A fresh table: just Mecatol Rex in the centre, ready for systems to be placed. */
export function defaultBoard(): GameState {
  const state = emptyState();
  const mecatol = makeTile({ q: 0, r: 0 }, MECATOL_REX);
  state.tiles[mecatol.id] = mecatol;
  return state;
}
