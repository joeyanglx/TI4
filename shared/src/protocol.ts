import type { Action, GameState } from './state';

/** Messages sent from browser to server. */
export type ClientMessage =
  | { type: 'join'; room: string; name: string }
  | { type: 'action'; action: Action };

/** Messages sent from server to browser. */
export type ServerMessage =
  | { type: 'snapshot'; state: GameState; players: string[] }
  | { type: 'action'; action: Action }
  | { type: 'players'; players: string[] };

export const WS_PATH = '/ws';
