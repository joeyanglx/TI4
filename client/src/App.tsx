import { useEffect, useState } from 'react';
import type { PlayerColor } from '@ti4/shared';
import { Board, type BoardMode } from './components/Board';
import { FactionIcon } from './components/cardParts';
import { EditionToggle } from './components/EditionToggle';
import { Lobby } from './components/Lobby';
import { RightPanel } from './components/RightPanel';
import { RollToast } from './components/RollToast';
import { Sidebar } from './components/Sidebar';
import { useGame } from './useGame';

interface Session {
  room: string;
  name: string;
}

function initialSession(): Session | null {
  const room = new URLSearchParams(location.search).get('room');
  const name = safeGet('ti4.name');
  return room && name ? { room, name } : null;
}

export function App() {
  const [session, setSession] = useState<Session | null>(initialSession);

  if (!session) {
    return (
      <Lobby
        onJoin={(room, name) => {
          safeSet('ti4.name', name);
          history.replaceState(null, '', `?room=${room}`);
          setSession({ room, name });
        }}
      />
    );
  }
  return <Table room={session.room} name={session.name} />;
}

function Table({ room, name }: Session) {
  const { state, players, status, history, dispatch, rewind } = useGame(room, name);
  const [color, setColor] = useState<PlayerColor>(
    () => (safeGet('ti4.color') as PlayerColor | null) ?? 'red',
  );
  const [mode, setMode] = useState<BoardMode>('play');

  // Share your colour so score markers and strategy card holders show it to everyone.
  const seatColor = state.seats[name]?.color;
  useEffect(() => {
    if (status === 'online' && seatColor !== color) dispatch({ type: 'seat/color', player: name, color });
  }, [status, seatColor, color, name, dispatch]);

  return (
    <div className="table">
      <header className="topbar">
        <strong>TI4 Table</strong>
        <span>Room: {room}</span>
        <span className={`status status-${status}`}>{status}</span>
        <EditionToggle state={state} dispatch={dispatch} />
        <div className="mode-toggle">
          <button className={mode === 'play' ? 'selected' : ''} onClick={() => setMode('play')}>
            Play
          </button>
          <button className={mode === 'edit' ? 'selected' : ''} onClick={() => setMode('edit')}>
            Edit map
          </button>
        </div>
        <span className="players">
          {players.map((p) => {
            const faction = state.seats[p]?.faction;
            return (
              <span key={p} className="topbar-player">
                {faction && <FactionIcon faction={faction} />}
                {p}
              </span>
            );
          })}
        </span>
      </header>
      <Sidebar
        color={color}
        onColorChange={(c) => {
          safeSet('ti4.color', c);
          setColor(c);
        }}
        tiles={state.tiles}
        edition={state.cards.edition}
        dispatch={dispatch}
      />
      <Board state={state} color={color} mode={mode} dispatch={dispatch} />
      <RightPanel
        state={state}
        room={room}
        online={players}
        me={name}
        history={history}
        dispatch={dispatch}
        onRewind={rewind}
      />
      <RollToast state={state} me={name} online={status === 'online'} />
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

