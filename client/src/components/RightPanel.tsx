import { useState } from 'react';
import type { Action, GameState, HistoryEntry } from '@ti4/shared';
import { CardsPanel } from './CardsPanel';
import { HistoryPanel } from './HistoryPanel';
import { Overview } from './Overview';

type Tab = 'board' | 'overview' | 'history';

interface Props {
  state: GameState;
  room: string;
  /** Players currently connected. */
  online: string[];
  me: string;
  history: HistoryEntry[];
  dispatch: (action: Action) => void;
  onRewind: (seq: number) => void;
}

/**
 * Right-hand panel, tabbed like the left sidebar: your player board, the overview (with the discard pile) and history.
 * Strategy cards, objectives and agendas are in the bar over the map.
 * Dice are rolled in battles, started by right-clicking a system.
 */
export function RightPanel({ state, room, online, me, history, dispatch, onRewind }: Props) {
  const [tab, setTab] = useState<Tab>('board');
  return (
    <aside className="right-panel">
      <div className="tabs">
        <button className={tab === 'board' ? 'selected' : ''} onClick={() => setTab('board')}>
          Player board
        </button>
        <button className={tab === 'overview' ? 'selected' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'history' ? 'selected' : ''} onClick={() => setTab('history')}>
          History
        </button>
      </div>
      <div className="right-panel-body">
        {tab === 'board' && <CardsPanel state={state} online={online} me={me} dispatch={dispatch} />}
        {tab === 'overview' && <Overview state={state} room={room} online={online} me={me} dispatch={dispatch} />}
        {tab === 'history' && <HistoryPanel state={state} history={history} onRewind={onRewind} />}
      </div>
    </aside>
  );
}
