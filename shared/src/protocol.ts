import type { HistoryEntry } from './history';
import type { Action, GameState } from './state';

/** Messages sent from browser to server. */
export type ClientMessage =
  | { type: 'join'; room: string; name: string }
  | { type: 'action'; action: Action }
  /** Put the whole table back to how it was just after history entry `seq` (0 = start of history). */
  | { type: 'rewind'; seq: number };

/** Messages sent from server to browser. */
export type ServerMessage =
  | { type: 'snapshot'; state: GameState; players: string[]; history: HistoryEntry[] }
  | { type: 'action'; action: Action }
  /** A new history entry, for everyone (including whoever did it). */
  | { type: 'history'; entry: HistoryEntry }
  | { type: 'players'; players: string[] };

export const WS_PATH = '/ws';
