import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { WebSocket } from 'ws';
import {
  applyAction,
  defaultBoard,
  isServerOrdered,
  withDefaults,
  type Action,
  type GameState,
  type ServerMessage,
} from '@ti4/shared';

const DATA_DIR = path.resolve(import.meta.dirname, '../data');
const SAVE_DELAY_MS = 1000;

interface Client {
  socket: WebSocket;
  name: string;
}

export class Room {
  private clients = new Set<Client>();
  private saveTimer: NodeJS.Timeout | undefined;

  constructor(
    readonly id: string,
    private state: GameState,
  ) {}

  join(socket: WebSocket, name: string): Client {
    const client = { socket, name };
    this.clients.add(client);
    send(socket, { type: 'snapshot', state: this.state, players: this.players() });
    this.broadcast({ type: 'players', players: this.players() }, client);
    return client;
  }

  leave(client: Client) {
    this.clients.delete(client);
    this.broadcast({ type: 'players', players: this.players() });
  }

  apply(action: Action, from: Client) {
    this.state = applyAction(this.state, action);
    // The sender already applied most actions locally; ordered ones it waits to hear back about.
    this.broadcast({ type: 'action', action }, isServerOrdered(action) ? undefined : from);
    this.scheduleSave();
  }

  get isEmpty() {
    return this.clients.size === 0;
  }

  private players() {
    return [...this.clients].map((c) => c.name);
  }

  private broadcast(message: ServerMessage, except?: Client) {
    for (const client of this.clients) {
      if (client !== except) send(client.socket, message);
    }
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void saveRoom(this.id, this.state);
    }, SAVE_DELAY_MS);
  }
}

const rooms = new Map<string, Room>();

export async function getRoom(id: string): Promise<Room> {
  let room = rooms.get(id);
  if (!room) {
    room = new Room(id, (await loadRoom(id)) ?? defaultBoard());
    rooms.set(id, room);
  }
  return room;
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function roomFile(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

async function loadRoom(id: string): Promise<GameState | undefined> {
  try {
    return withDefaults(JSON.parse(await readFile(roomFile(id), 'utf8')) as Partial<GameState>);
  } catch {
    return undefined;
  }
}

async function saveRoom(id: string, state: GameState) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(roomFile(id), JSON.stringify(state));
}
