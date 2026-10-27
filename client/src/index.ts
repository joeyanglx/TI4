import type { GameClient } from '@joeyanglx/ahob-client';
import { ti4Rules, type Action, type GameState } from '@joeyanglx/ti4-rules';
import { Table } from './Table';
import './styles.css';

/** The TI4 table's browser side, for the platform's game list. English only. */
export const ti4Client: GameClient<GameState, Action> = { rules: ti4Rules, Table, languages: ['en'] };

export { Table };
