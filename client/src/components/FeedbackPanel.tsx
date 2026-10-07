import { useEffect, useState } from 'react';
import type { FeedbackItem, FeedbackStatus } from '@ti4/shared';

const POLL_MS = 15_000;
const SEEN_KEY = 'ti4.feedbackSeen';

const STATUS_LABEL: Record<FeedbackStatus | 'new', string> = {
  new: 'Sent',
  seen: 'Seen',
  working: 'Working on it',
  done: 'Done',
  declined: 'Not doing',
};

async function fetchFeedback(): Promise<FeedbackItem[]> {
  const res = await fetch('/api/feedback');
  return res.ok ? ((await res.json()) as FeedbackItem[]) : [];
}

/** Newest reply time, so the top-bar button can show a dot when there's an answer you haven't opened. */
function latestReply(items: FeedbackItem[]): number {
  return items.reduce((t, i) => Math.max(t, i.repliedAt ?? 0), 0);
}

/** Top-bar button plus the panel where players send feedback and see replies. */
export function FeedbackButton({ me, room }: { me: string; room: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [seen, setSeen] = useState(() => Number(safeGet(SEEN_KEY) ?? 0));

  useEffect(() => {
    let alive = true;
    const load = () => fetchFeedback().then((f) => alive && setItems(f), () => {});
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const newest = latestReply(items);
  useEffect(() => {
    if (open && newest > seen) {
      setSeen(newest);
      safeSet(SEEN_KEY, String(newest));
    }
  }, [open, newest, seen]);

  return (
    <>
      <button className="feedback-button" onClick={() => setOpen(true)}>
        Feedback{newest > seen && <span className="feedback-dot" title="New reply" />}
      </button>
      {open && (
        <FeedbackPanel
          me={me}
          room={room}
          items={items}
          onSent={(item) => setItems((f) => [...f, item])}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface PanelProps {
  me: string;
  room: string;
  items: FeedbackItem[];
  onSent: (item: FeedbackItem) => void;
  onClose: () => void;
}

function FeedbackPanel({ me, room, items, onSent, onClose }: PanelProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from: me, room, text }),
      });
      if (!res.ok) throw new Error();
      onSent((await res.json()) as FeedbackItem);
      setText('');
    } catch {
      setError("Couldn't send it. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="battle-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="battle-panel feedback-panel" role="dialog" aria-label="Feedback">
        <header className="battle-header">
          <h2>Feedback &amp; requests</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="feedback-body">
          <p className="hint">
            Found a bug or want something changed? Describe it here. Changes are made while you play; when one is done
            it's marked <b>Done</b> with a note, and you may need to reload the page to get it.
          </p>
          <textarea
            value={text}
            maxLength={4000}
            rows={8}
            placeholder="e.g. Let me drag a whole stack of fighters into a carrier at once"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) void send();
            }}
          />
          <div className="row">
            {error && <span className="warn">{error}</span>}
            <button className="primary" disabled={!text.trim() || sending} onClick={() => void send()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          <ul className="feedback-list">
            {[...items].reverse().map((item) => (
              <li key={item.id}>
                <div className="feedback-meta">
                  <b>{item.from}</b>
                  <span className="muted">{new Date(item.at).toLocaleString()}</span>
                  <span className={`feedback-status status-${item.status ?? 'new'}`}>{STATUS_LABEL[item.status ?? 'new']}</span>
                </div>
                <p className="feedback-text">{item.text}</p>
                {item.reply && <p className="feedback-reply">{item.reply}</p>}
              </li>
            ))}
            {items.length === 0 && <li className="muted">Nothing sent yet.</li>}
          </ul>
        </div>
      </div>
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
