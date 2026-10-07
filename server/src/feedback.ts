import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FeedbackItem, FeedbackReply } from '@ti4/shared';

const DATA_DIR = path.resolve(import.meta.dirname, '../data');
/** Written only by this server: what players sent. */
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
/** Written only by whoever answers (by hand or by Claude Code), keyed by feedback id. Never written here. */
const REPLIES_FILE = path.join(DATA_DIR, 'feedback-replies.json');
const MAX_TEXT = 4000;
const MAX_BODY = 16_000;

// Appends are queued so two players sending at once can't overwrite each other.
let writing = Promise.resolve();

/** Handles /api/feedback; returns false for any other path. */
export async function handleFeedback(req: IncomingMessage, res: ServerResponse, urlPath: string): Promise<boolean> {
  if (urlPath !== '/api/feedback') return false;
  if (req.method === 'GET') {
    json(res, 200, await listFeedback());
  } else if (req.method === 'POST') {
    const body = await readBody(req);
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : '';
    if (!text) return json(res, 400, { error: 'Empty feedback' }), true;
    const item: FeedbackItem = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(),
      from: typeof body?.from === 'string' ? body.from.slice(0, 32) : 'Someone',
      room: typeof body?.room === 'string' ? body.room.slice(0, 40) : '',
      text,
    };
    writing = writing.then(async () => {
      const items = await readJson<FeedbackItem[]>(FEEDBACK_FILE, []);
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(FEEDBACK_FILE, JSON.stringify([...items, item], null, 2));
    });
    await writing;
    console.log(`feedback from ${item.from}: ${text.slice(0, 80)}`);
    json(res, 201, item);
  } else {
    res.writeHead(405).end();
  }
  return true;
}

async function listFeedback(): Promise<FeedbackItem[]> {
  const items = await readJson<FeedbackItem[]>(FEEDBACK_FILE, []);
  const replies = await readJson<Record<string, FeedbackReply>>(REPLIES_FILE, {});
  return items.map((item) => ({ ...item, ...replies[item.id] }));
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on('error', () => resolve(undefined));
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}
