import { applyCardAction, emptyCards, type CardAction, type CardsState } from './cards';
import { hexKey, type Hex } from './hex';
import type { PieceKind, PlayerColor } from './pieces';
import { applyPlayerAction, type PlanetState, type PlayerAction, type Seat } from './players';

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

export interface GameState {
  tiles: Record<string, Tile>;
  pieces: Record<string, Piece>;
  cards: CardsState;
  seats: Record<string, Seat>;
  planets: Record<string, PlanetState>;
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
  | { type: 'game/reset'; state: GameState }
  | CardAction
  | PlayerAction;

/**
 * Card, seat and planet actions depend on order (two players drawing at once must get different cards,
 * and counters clamp at zero), so clients don't apply them optimistically: the server applies them first
 * and sends them to everyone.
 */
export function isServerOrdered(action: Action): boolean {
  return /^(cards?|strategy|seat|planet)\//.test(action.type);
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
    case 'game/reset':
      return action.state;
    case 'strategy/pick': {
      // Whoever picks a strategy card takes the trade goods piled on it.
      const card = state.cards.strategy.find((s) => s.id === action.id);
      const picked = { ...state, cards: applyCardAction(state.cards, action) };
      if (!card?.tradeGoods || !action.player) return picked;
      return applyPlayerAction(picked, { type: 'seat/tradeGoods', player: action.player, amount: card.tradeGoods });
    }
    default:
      if (action.type.startsWith('seat/') || action.type.startsWith('planet/')) {
        return applyPlayerAction(state, action as PlayerAction);
      }
      return { ...state, cards: applyCardAction(state.cards, action as CardAction) };
  }
}

export function makeTile(hex: Hex, system: string, rotation = 0): Tile {
  return { id: hexKey(hex), q: hex.q, r: hex.r, system, rotation };
}

export function emptyState(): GameState {
  return { tiles: {}, pieces: {}, cards: emptyCards(), seats: {}, planets: {} };
}
