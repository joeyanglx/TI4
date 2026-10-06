import { useState } from 'react';
import type { Action, GameState } from '@ti4/shared';
import { CardsPanel } from './CardsPanel';
import { DicePanel } from './DicePanel';
import { Overview } from './Overview';

type Tab = 'board' | 'overview' | 'dice';

interface Props {
  state: GameState;
  room: string;
  /** Players currently connected. */
  online: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/** Right-hand panel, tabbed like the left sidebar: the player board (cards, your stuff), the overview and dice. */
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
        <button className={tab === 'dice' ? 'selected' : ''} onClick={() => setTab('dice')}>
          Dice
        </button>
      </div>
      <div className="right-panel-body">
        {tab === 'board' && <CardsPanel state={state} online={online} me={me} dispatch={dispatch} />}
        {tab === 'overview' && <Overview state={state} room={room} online={online} me={me} />}
        {tab === 'dice' && <DicePanel state={state} me={me} dispatch={dispatch} />}
      </div>
    </aside>
  );
}
