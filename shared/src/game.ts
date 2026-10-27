import type { GameRules } from '@joeyanglx/ahob-core';
import { describeAction, entryGroup } from './history';
import { defaultBoard, withDefaults } from './setup';
import { applyAction, isServerOrdered, type Action, type GameState } from './state';

/** Twilight Imperium 4, as the platform runs it: new rooms start with Mecatol Rex on the board. */
export const ti4Rules: GameRules<GameState, Action> = {
  id: 'ti4',
  title: 'Twilight Imperium 4',
  emptyState: defaultBoard,
  withDefaults: (saved) => withDefaults(saved as Partial<GameState>),
  applyAction,
  describeAction: (state, action) => describeAction(state, action),
  isServerOrdered,
  entryGroup,
};
