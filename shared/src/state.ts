import { applyCardAction, emptyCards, type CardAction, type CardsState } from './cards';
import { hexKey, type Hex } from './hex';
import type { PieceKind, PlayerColor } from './pieces';
import { applyPlayerAction, type PlanetState, type PlayerAction, type PromissoryState, type Seat } from './players';
import { applyTokenAction, type TokenAction } from './tokens';

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
  /** Units in this stack (1 if unset). Tokens never stack. */
  count?: number;
  /** How many units in the stack have sustained damage. */
  damaged?: number;
}

export function stackSize(piece: Piece): number {
  return piece.count ?? 1;
}

export interface GameState {
  tiles: Record<string, Tile>;
  pieces: Record<string, Piece>;
  cards: CardsState;
  seats: Record<string, Seat>;
  planets: Record<string, PlanetState>;
  /** Promissory notes that have left their owner's hand, keyed by promissoryKey. */
  promissory: Record<string, PromissoryState>;
  /** Player holding the speaker token. Undefined while it's on the map (as a "speaker" piece) or unassigned. */
  speaker?: string;
}

export type Action =
  | { type: 'piece/add'; piece: Piece }
  | { type: 'piece/move'; id: string; x: number; y: number }
  | { type: 'piece/remove'; id: string }
  /** Add units to (or take them from) a stack; it never drops below 1, remove the piece for that. */
  | { type: 'piece/count'; id: string; amount: number }
  /** Mark units in a stack as damaged (or repaired). */
  | { type: 'piece/damage'; id: string; amount: number }
  /** Drop one stack onto another of the same unit and colour. */
  | { type: 'piece/merge'; from: string; into: string }
  /** Take one unit off a stack as its own piece, preferring an undamaged one. */
  | { type: 'piece/split'; id: string; newId: string; x: number; y: number }
  | { type: 'tile/place'; tile: Tile }
  | { type: 'tile/remove'; id: string }
  | { type: 'tile/rotate'; id: string }
  | { type: 'tile/move'; from: Hex; to: Hex }
  | { type: 'map/set'; tiles: Record<string, Tile> }
  | { type: 'game/reset'; state: GameState }
  | CardAction
  | PlayerAction
  | TokenAction;

/**
 * Card, seat and planet actions depend on order (two players drawing at once must get different cards,
 * and counters clamp at zero), so clients don't apply them optimistically: the server applies them first
 * and sends them to everyone.
 */
export function isServerOrdered(action: Action): boolean {
  return (
    /^(cards?|strategy|seat|planet|tech|token|speaker|promissory)\//.test(action.type) ||
    // Stack edits depend on the current count; moving pieces stays instant.
    /^piece\/(count|damage|merge|split)$/.test(action.type)
  );
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
    case 'piece/count': {
      const piece = state.pieces[action.id];
      if (!piece) return state;
      const count = Math.max(1, stackSize(piece) + action.amount);
      return withPiece(state, { ...piece, count, damaged: Math.min(piece.damaged ?? 0, count) });
    }
    case 'piece/damage': {
      const piece = state.pieces[action.id];
      if (!piece) return state;
      const damaged = Math.min(stackSize(piece), Math.max(0, (piece.damaged ?? 0) + action.amount));
      return withPiece(state, { ...piece, damaged });
    }
    case 'piece/merge': {
      const from = state.pieces[action.from];
      const into = state.pieces[action.into];
      if (!from || !into || from.id === into.id || from.kind !== into.kind || from.color !== into.color) return state;
      const { [from.id]: _merged, ...pieces } = state.pieces;
      const merged = {
        ...into,
        count: stackSize(into) + stackSize(from),
        damaged: (into.damaged ?? 0) + (from.damaged ?? 0),
      };
      return { ...state, pieces: { ...pieces, [into.id]: merged } };
    }
    case 'piece/split': {
      const piece = state.pieces[action.id];
      if (!piece || stackSize(piece) < 2) return state;
      // Leave damaged units in the stack unless they're all damaged.
      const damaged = piece.damaged ?? 0;
      const splitDamaged = damaged >= stackSize(piece) ? 1 : 0;
      const rest = { ...piece, count: stackSize(piece) - 1, damaged: damaged - splitDamaged };
      const single = { ...piece, id: action.newId, x: action.x, y: action.y, count: 1, damaged: splitDamaged };
      return { ...state, pieces: { ...state.pieces, [rest.id]: rest, [single.id]: single } };
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
      if (/^(token|speaker)\//.test(action.type)) return applyTokenAction(state, action as TokenAction);
      if (/^(seat|planet|tech|promissory)\//.test(action.type)) {
        return applyPlayerAction(state, action as PlayerAction);
      }
      return { ...state, cards: applyCardAction(state.cards, action as CardAction) };
  }
}

function withPiece(state: GameState, piece: Piece): GameState {
  return { ...state, pieces: { ...state.pieces, [piece.id]: piece } };
}

export function makeTile(hex: Hex, system: string, rotation = 0): Tile {
  return { id: hexKey(hex), q: hex.q, r: hex.r, system, rotation };
}

export function emptyState(): GameState {
  return { tiles: {}, pieces: {}, cards: emptyCards(), seats: {}, planets: {}, promissory: {} };
}
