import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { WebSocket } from 'ws';
import {
  applyAction,
  defaultBoard,
  describeAction,
  isServerOrdered,
  stateAt,
  toEntry,
  withDefaults,
  type Action,
  type GameState,
  type HistoryRecord,
  type ServerMessage,
} from '@ti4/shared';

const DATA_DIR = path.resolve(import.meta.dirname, '../data');
const SAVE_DELAY_MS = 1000;

interface Client {
  socket: WebSocket;
  name: string;
}

/** Everything needed to rebuild the table at any point: where history starts, and every step since. */
interface History {
  base: GameState;
  records: HistoryRecord[];
}

export class Room {
  private clients = new Set<Client>();
  private saveTimer: NodeJS.Timeout | undefined;

  constructor(
    readonly id: string,
    private state: GameState,
    private history: History,
  ) {}

  join(socket: WebSocket, name: string): Client {
    const client = { socket, name };
    this.clients.add(client);
    send(socket, this.snapshot());
    this.broadcast({ type: 'players', players: this.players() }, client);
    return client;
  }

  leave(client: Client) {
    this.clients.delete(client);
    this.broadcast({ type: 'players', players: this.players() });
  }

  apply(action: Action, from: Client) {
    const text = describe(this.state, action);
    this.state = applyAction(this.state, action);
    const record = this.record({ player: from.name, text, action });
    // The sender already applied most actions locally; ordered ones it waits to hear back about.
    this.broadcast({ type: 'action', action }, isServerOrdered(action) ? undefined : from);
    this.broadcast({ type: 'history', entry: toEntry(record) });
    this.scheduleSave();
  }

  /** Put the table back to just after entry `seq`. The rewind is logged too, so it can itself be undone. */
  rewind(seq: number, from: Client) {
    const last = this.history.records.at(-1)?.seq ?? 0;
    if (!Number.isInteger(seq) || seq < 0 || seq > last) return;
    this.state = stateAt(this.history.base, this.history.records, seq);
    this.record({ player: from.name, text: seq ? `rewound the table to #${seq}` : 'rewound the table to the start', rewindTo: seq });
    // Everyone gets the rewound table (and the new log) as a fresh snapshot.
    this.broadcast(this.snapshot());
    this.scheduleSave();
  }

  get isEmpty() {
    return this.clients.size === 0;
  }

  private record(entry: Omit<HistoryRecord, 'seq' | 'at'>): HistoryRecord {
    const record = { seq: (this.history.records.at(-1)?.seq ?? 0) + 1, at: Date.now(), ...entry };
    this.history.records.push(record);
    return record;
  }

  private snapshot(): ServerMessage {
    return { type: 'snapshot', state: this.state, players: this.players(), history: this.history.records.map(toEntry) };
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
      void saveRoom(this.id, this.state, this.history);
    }, SAVE_DELAY_MS);
  }
}

/** A description should never stop an action from going through. */
function describe(state: GameState, action: Action): string {
  try {
    return describeAction(state, action);
  } catch {
    return `did ${action.type}`;
  }
}

const rooms = new Map<string, Room>();

export async function getRoom(id: string): Promise<Room> {
  let room = rooms.get(id);
  if (!room) {
    const state = (await loadRoom(id)) ?? defaultBoard();
    // Rooms saved before history existed start their history now.
    const history = (await loadHistory(id)) ?? { base: state, records: [] };
    room = new Room(id, state, history);
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

function historyFile(id: string) {
  return path.join(DATA_DIR, `${id}.history.json`);
}

async function loadRoom(id: string): Promise<GameState | undefined> {
  try {
    return withDefaults(JSON.parse(await readFile(roomFile(id), 'utf8')) as Partial<GameState>);
  } catch {
    return undefined;
  }
}

async function loadHistory(id: string): Promise<History | undefined> {
  try {
    const saved = JSON.parse(await readFile(historyFile(id), 'utf8')) as History;
    return { base: withDefaults(saved.base), records: saved.records };
  } catch {
    return undefined;
  }
}

async function saveRoom(id: string, state: GameState, history: History) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(roomFile(id), JSON.stringify(state));
  await writeFile(historyFile(id), JSON.stringify(history));
}
