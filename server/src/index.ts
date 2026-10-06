import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { WebSocketServer } from 'ws';
import { WS_PATH, type ClientMessage } from '@ti4/shared';
import { getRoom, type Room } from './rooms';

const PORT = Number(process.env.PORT ?? 3001);
const ROOM_ID = /^[a-z0-9-]{1,40}$/;

// In production the server also hosts the built client, so friends only need one URL.
const CLIENT_DIR = path.resolve(import.meta.dirname, '../../client/dist');
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = path.join(CLIENT_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(CLIENT_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found. In development, open the Vite URL instead (npm run dev).');
  }
});

const wss = new WebSocketServer({ server, path: WS_PATH });

wss.on('connection', (socket) => {
  let room: Room | undefined;
  let client: ReturnType<Room['join']> | undefined;

  socket.on('message', async (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    if (message.type === 'join' && !room) {
      if (!ROOM_ID.test(message.room)) return socket.close(1008, 'Invalid room id');
      room = await getRoom(message.room);
      client = room.join(socket, message.name.slice(0, 32) || 'Player');
      console.log(`${client.name} joined ${room.id}`);
    } else if (message.type === 'action' && room && client) {
      room.apply(message.action, client);
    }
  });

  socket.on('close', () => {
    if (room && client) room.leave(client);
  });
});

server.listen(PORT, () => {
  console.log(`TI4 server listening on http://localhost:${PORT} (websocket ${WS_PATH})`);
});
