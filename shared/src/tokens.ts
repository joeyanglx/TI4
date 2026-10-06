import { COMMAND_TOKENS, TOKEN_POOLS, seatOf, type TokenPool } from './players';
import type { GameState, Piece } from './state';

/**
 * Where a token is dragged from or to on a player's panel: a command sheet pool, reinforcements,
 * or the speaker token.
 */
export type TokenSlot = TokenPool | 'reinforcements' | 'speaker';

export type TokenAction =
  /** Drag a token from a player's panel onto the map. */
  | { type: 'token/place'; player: string; from: TokenSlot; piece: Piece }
  /** Drag a token from the map back onto a player's panel. */
  | { type: 'token/return'; piece: string; player: string; to: TokenSlot }
  /** Hand the speaker token to a player (or nobody); takes it off the map if it's there. */
  | { type: 'speaker/set'; player?: string };

/** Command tokens not on the player's command sheet or on the board in their colour. */
export function reinforcements(state: GameState, player: string): number {
  const seat = seatOf(state.seats, player);
  const onBoard = Object.values(state.pieces).filter((p) => p.kind === 'command' && p.color === seat.color).length;
  const onSheet = TOKEN_POOLS.reduce((sum, pool) => sum + seat.tokens[pool], 0);
  return COMMAND_TOKENS - onSheet - onBoard;
}

export function applyTokenAction(state: GameState, action: TokenAction): GameState {
  switch (action.type) {
    case 'token/place': {
      const { from, player, piece } = action;
      if (from === 'speaker') {
        // There's only one speaker token: it leaves the player and any old spot on the map.
        const cleared = withoutSpeakerPiece(state);
        return { ...cleared, speaker: undefined, pieces: { ...cleared.pieces, [piece.id]: { ...piece, kind: 'speaker' } } };
      }
      if (from === 'reinforcements') {
        if (reinforcements(state, player) <= 0) return state;
      } else {
        const seat = seatOf(state.seats, player);
        if (seat.tokens[from] <= 0) return state;
        state = {
          ...state,
          seats: { ...state.seats, [player]: { ...seat, tokens: { ...seat.tokens, [from]: seat.tokens[from] - 1 } } },
        };
      }
      return { ...state, pieces: { ...state.pieces, [piece.id]: { ...piece, kind: 'command' } } };
    }
    case 'token/return': {
      const piece = state.pieces[action.piece];
      if (!piece) return state;
      const { [action.piece]: _removed, ...pieces } = state.pieces;
      if (piece.kind === 'speaker') return { ...state, pieces, speaker: action.player };
      if (piece.kind !== 'command') return state;
      if (action.to === 'reinforcements' || action.to === 'speaker') return { ...state, pieces };
      const seat = seatOf(state.seats, action.player);
      return {
        ...state,
        pieces,
        seats: {
          ...state.seats,
          [action.player]: { ...seat, tokens: { ...seat.tokens, [action.to]: seat.tokens[action.to] + 1 } },
        },
      };
    }
    case 'speaker/set':
      return { ...withoutSpeakerPiece(state), speaker: action.player };
  }
}

function withoutSpeakerPiece(state: GameState): GameState {
  return { ...state, pieces: Object.fromEntries(Object.entries(state.pieces).filter(([, p]) => p.kind !== 'speaker')) };
}
