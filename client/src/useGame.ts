import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WS_PATH,
  applyAction,
  emptyState,
  isServerOrdered,
  type Action,
  type ClientMessage,
  type GameState,
  type HistoryEntry,
  type ServerMessage,
} from '@ti4/shared';

const RECONNECT_MS = 2000;

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

/** Connects to a room and keeps a local copy of the board in sync with the server. */
export function useGame(room: string, name: string) {
  const [state, setState] = useState<GameState>(emptyState);
  const [players, setPlayers] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${protocol}://${location.host}${WS_PATH}`);
      socketRef.current = socket;
      setStatus('connecting');

      socket.onopen = () => send(socket, { type: 'join', room, name });
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        switch (message.type) {
          case 'snapshot':
            // Only count as online once synced, so nothing is dispatched against the empty placeholder state.
            setStatus('online');
            setState(message.state);
            setPlayers(message.players);
            setHistory(message.history);
            break;
          case 'history':
            setHistory((h) => [...h, message.entry]);
            break;
          case 'action':
            setState((s) => applyAction(s, message.action));
            break;
          case 'players':
            setPlayers(message.players);
            break;
        }
      };
      socket.onclose = () => {
        setStatus('offline');
        if (!closed) retry = setTimeout(connect, RECONNECT_MS);
      };
    }

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      socketRef.current?.close();
    };
  }, [room, name]);

  /** Apply locally right away (so dragging feels instant), then tell the server. */
  const dispatch = useCallback((action: Action) => {
    if (!isServerOrdered(action)) setState((s) => applyAction(s, action));
    const socket = socketRef.current;
    if (socket) send(socket, { type: 'action', action });
  }, []);

  /** Put the whole table back to just after history entry `seq`; the server sends everyone the result. */
  const rewind = useCallback((seq: number) => {
    const socket = socketRef.current;
    if (socket) send(socket, { type: 'rewind', seq });
  }, []);

  return { state, players, status, history, dispatch, rewind };
}

function send(socket: WebSocket, message: ClientMessage) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}
