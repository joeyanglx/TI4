import { applyCardAction, emptyCards, type CardAction, type CardsState } from './cards';
import { hexKey, type Hex } from './hex';
import type { PieceKind, PlayerColor } from './pieces';

export interface Tile extends Hex {
  id: string;
  /** System tile number, e.g. "18" for Mecatol Rex. */
  system: string;
  /** Clockwise rotation in 60° steps (0–5). Matters for hyperlanes. */
  rotation?: number;
}

export interface Piece {
  id: string;
  kind: PieceKind;
  color: PlayerColor;
  /** Free position on the board, in board pixels. */
  x: number;
  y: number;
}

/** Per-player info everyone can see, keyed by player name. */
export interface Seat {
  color?: PlayerColor;
  /** Victory points from anything other than objectives: custodians, agendas, relics, Imperial. */
  bonusVp: number;
}

export interface GameState {
  tiles: Record<string, Tile>;
  pieces: Record<string, Piece>;
  cards: CardsState;
  seats: Record<string, Seat>;
}

export type Action =
  | { type: 'piece/add'; piece: Piece }
  | { type: 'piece/move'; id: string; x: number; y: number }
  | { type: 'piece/remove'; id: string }
  | { type: 'tile/place'; tile: Tile }
  | { type: 'tile/remove'; id: string }
  | { type: 'tile/rotate'; id: string }
  | { type: 'tile/move'; from: Hex; to: Hex }
  | { type: 'map/set'; tiles: Record<string, Tile> }
  | { type: 'seat/color'; player: string; color: PlayerColor }
  | { type: 'seat/bonusVp'; player: string; amount: number }
  | { type: 'game/reset'; state: GameState }
  | CardAction;

/**
 * Card actions depend on order (two players drawing at once must get different cards), so clients
 * don't apply them optimistically: the server applies them first and sends them to everyone.
 */
export function isServerOrdered(action: Action): boolean {
  return /^(cards?|strategy)\//.test(action.type);
}

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
    case 'tile/rotate': {
      const tile = state.tiles[action.id];
      if (!tile) return state;
      const rotation = ((tile.rotation ?? 0) + 1) % 6;
      return { ...state, tiles: { ...state.tiles, [action.id]: { ...tile, rotation } } };
    }
    case 'tile/move': {
      // Moving onto an occupied hex swaps the two tiles.
      const fromId = hexKey(action.from);
      const toId = hexKey(action.to);
      const moving = state.tiles[fromId];
      if (!moving || fromId === toId) return state;
      const tiles = { ...state.tiles };
      const displaced = tiles[toId];
      delete tiles[fromId];
      if (displaced) tiles[fromId] = { ...displaced, id: fromId, ...action.from };
      tiles[toId] = { ...moving, id: toId, ...action.to };
      return { ...state, tiles };
    }
    case 'map/set':
      return { ...state, tiles: action.tiles };
    case 'seat/color':
      return { ...state, seats: { ...state.seats, [action.player]: { ...seat(state, action.player), color: action.color } } };
    case 'seat/bonusVp': {
      const current = seat(state, action.player);
      return {
        ...state,
        seats: { ...state.seats, [action.player]: { ...current, bonusVp: Math.max(0, current.bonusVp + action.amount) } },
      };
    }
    case 'game/reset':
      return action.state;
    default:
      return { ...state, cards: applyCardAction(state.cards, action) };
  }
}

function seat(state: GameState, player: string): Seat {
  return state.seats[player] ?? { bonusVp: 0 };
}

export function makeTile(hex: Hex, system: string, rotation = 0): Tile {
  return { id: hexKey(hex), q: hex.q, r: hex.r, system, rotation };
}

export function emptyState(): GameState {
  return { tiles: {}, pieces: {}, cards: emptyCards(), seats: {} };
}
