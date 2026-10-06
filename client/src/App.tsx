import { useState } from 'react';
import type { PlayerColor } from '@ti4/shared';
import { Board } from './components/Board';
import { Lobby } from './components/Lobby';
import { Palette } from './components/Palette';
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
  const { state, players, status, dispatch } = useGame(room, name);
  const [color, setColor] = useState<PlayerColor>(
    () => (safeGet('ti4.color') as PlayerColor | null) ?? 'red',
  );

  return (
    <div className="table">
      <header className="topbar">
        <strong>TI4 Table</strong>
        <span>Room: {room}</span>
        <span className={`status status-${status}`}>{status}</span>
        <span className="players">{players.join(', ')}</span>
      </header>
      <Palette
        color={color}
        onColorChange={(c) => {
          safeSet('ti4.color', c);
          setColor(c);
        }}
      />
      <Board state={state} color={color} dispatch={dispatch} />
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

