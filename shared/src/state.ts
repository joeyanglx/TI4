import type { Hex } from './hex';
import type { PieceKind, PlayerColor } from './pieces';

export interface Tile extends Hex {
  id: string;
  /** System tile number, e.g. "18" for Mecatol Rex. */
  system: string;
}

export interface Piece {
  id: string;
  kind: PieceKind;
  color: PlayerColor;
  /** Free position on the board, in board pixels. */
  x: number;
  y: number;
}

export interface GameState {
  tiles: Record<string, Tile>;
  pieces: Record<string, Piece>;
}

export type Action =
  | { type: 'piece/add'; piece: Piece }
  | { type: 'piece/move'; id: string; x: number; y: number }
  | { type: 'piece/remove'; id: string }
  | { type: 'tile/place'; tile: Tile }
  | { type: 'tile/remove'; id: string }
  | { type: 'game/reset'; state: GameState };

/**
 * Pure state update shared by client (optimistic) and server (authoritative).
 * Every change to the board must go through here so all players stay in sync.
 */
export function applyAction(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'piece/add':
      return { ...state, pieces: { ...state.pieces, [action.piece.id]: action.piece } };
    case 'piece/move': {
      const piece = state.pieces[action.id];
      if (!piece) return state;
      return {
        ...state,
        pieces: { ...state.pieces, [action.id]: { ...piece, x: action.x, y: action.y } },
      };
    }
    case 'piece/remove': {
      const { [action.id]: _removed, ...pieces } = state.pieces;
      return { ...state, pieces };
    }
    case 'tile/place':
      return { ...state, tiles: { ...state.tiles, [action.tile.id]: action.tile } };
    case 'tile/remove': {
      const { [action.id]: _removed, ...tiles } = state.tiles;
      return { ...state, tiles };
    }
    case 'game/reset':
      return action.state;
  }
}

export function emptyState(): GameState {
  return { tiles: {}, pieces: {} };
}
