import { useState } from 'react';
import type { Action, GameState } from '@ti4/shared';
import { CardsPanel } from './CardsPanel';
import { Overview } from './Overview';

type Tab = 'board' | 'overview';

interface Props {
  state: GameState;
  room: string;
  /** Players currently connected. */
  online: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/** Right-hand panel, tabbed like the left sidebar: the player board (cards, your stuff) and the overview. */
export function RightPanel({ state, room, online, me, dispatch }: Props) {
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
      </div>
      <div className="right-panel-body">
        {tab === 'board' ? (
          <CardsPanel state={state} online={online} me={me} dispatch={dispatch} />
        ) : (
          <Overview state={state} room={room} online={online} me={me} dispatch={dispatch} />
        )}
      </div>
    </aside>
  );
}
