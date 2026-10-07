import { useState } from 'react';
import type { Action, GameState } from '@ti4/shared';
import { knownPlayers } from '../players';
import { AgendaSection } from './AgendaSection';
import { RelicSection } from './RelicSection';
import { ObjectivesSection, StrategySection } from './TablePanels';

const OPEN_KEY = 'ti4.tableBarOpen';

interface Props {
  state: GameState;
  /** Players currently connected. */
  online: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/** The shared table across the top of the map: strategy cards, public objectives, agendas and relics. */
export function TableBar({ state, online, me, dispatch }: Props) {
  const [open, setOpen] = useState(() => safeGet(OPEN_KEY) !== 'false');
  const players = knownPlayers(state, online, me);
  const held = state.cards.strategy.filter((s) => s.holder).length;

  function toggle() {
    safeSet(OPEN_KEY, String(!open));
    setOpen(!open);
  }

  return (
    <div className={`table-bar ${open ? 'open' : ''}`}>
      <button className="table-bar-toggle" onClick={toggle} title={open ? 'Hide to see more of the map' : undefined}>
        {open ? '▴ Hide table' : `▾ Strategy cards (${held} picked) · ${state.cards.revealed.length} objectives · agendas`}
      </button>
      {open && (
        <div className="table-bar-columns cards-panel">
          <StrategySection state={state} players={players} dispatch={dispatch} />
          <ObjectivesSection state={state} me={me} dispatch={dispatch} />
          <AgendaSection state={state} players={players} dispatch={dispatch} />
          {state.cards.edition !== 'base' && <RelicSection state={state} players={players} me={me} dispatch={dispatch} />}
        </div>
      )}
    </div>
  );
}

// localStorage can throw in private windows; it's only a convenience here.
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
