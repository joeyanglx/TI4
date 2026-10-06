import { useState } from 'react';
import type { GameState, HistoryEntry } from '@ti4/shared';
import { PlayerTag } from './cardParts';

interface Props {
  state: GameState;
  history: HistoryEntry[];
  onRewind: (seq: number) => void;
}

/** A run of entries shown as one line: consecutive moves by the same player collapse together. */
interface Row {
  entries: HistoryEntry[];
}

const PAGE = 200;

/** Shared log of everything anyone did, newest first, with a confirmed "rewind to here" on each entry. */
export function HistoryPanel({ state, history, onRewind }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const rows = collapse(history).reverse();
  const latest = history.at(-1)?.seq;

  const entryLine = (e: HistoryEntry) => (
    <div key={e.seq} className={`history-entry ${e.rewindTo !== undefined ? 'rewind' : ''}`}>
      <span className="history-seq">#{e.seq}</span>
      <div className="history-text">
        <PlayerTag player={e.player} state={state} /> {e.text}
        <span className="muted history-time"> · {time(e.at)}</span>
      </div>
      {e.seq !== latest &&
        (confirming === e.seq ? (
          <span className="history-confirm">
            <button
              className="danger"
              onClick={() => {
                onRewind(e.seq);
                setConfirming(null);
              }}
            >
              Rewind
            </button>
            <button onClick={() => setConfirming(null)}>Cancel</button>
          </span>
        ) : (
          <button title="Put the whole table back to just after this" onClick={() => setConfirming(e.seq)}>
            Rewind to here
          </button>
        ))}
    </div>
  );

  return (
    <div className="history-panel">
      <section>
        <h2>History ({history.length})</h2>
        <p className="hint">
          Everything anyone does, newest first. Rewinding puts the whole table back to just after that entry for
          everyone; the rewind is logged too, so it can be undone by rewinding again.
        </p>
        {confirming !== null && (
          <p className="history-warning">
            Rewind the whole table to just after #{confirming}? Everyone's board, cards and hands go back to that moment.
          </p>
        )}
        {rows.length === 0 && <p className="hint">Nothing has happened yet.</p>}
        {rows.slice(0, limit).map((row) => {
          const last = row.entries.at(-1)!;
          if (row.entries.length === 1) return entryLine(last);
          const open = expanded.has(last.seq);
          const toggle = () => {
            const next = new Set(expanded);
            if (open) next.delete(last.seq);
            else next.add(last.seq);
            setExpanded(next);
          };
          return (
            <div key={last.seq} className="history-group">
              <button className="history-group-toggle" onClick={toggle}>
                {open ? '▾' : '▸'} <PlayerTag player={last.player} state={state} /> made {row.entries.length} moves
                <span className="muted"> · #{row.entries[0].seq}–{last.seq}</span>
              </button>
              {open ? [...row.entries].reverse().map(entryLine) : entryLine(last)}
            </div>
          );
        })}
        {rows.length > limit && <button onClick={() => setLimit(limit + PAGE)}>Show older entries</button>}
        {history.length > 0 && confirming === null && (
          <button className="history-start" onClick={() => setConfirming(0)}>
            Rewind to the start of history
          </button>
        )}
        {confirming === 0 && (
          <span className="history-confirm">
            <button className="danger" onClick={() => (onRewind(0), setConfirming(null))}>
              Rewind to the start
            </button>
            <button onClick={() => setConfirming(null)}>Cancel</button>
          </span>
        )}
      </section>
    </div>
  );
}

function collapse(history: HistoryEntry[]): Row[] {
  const rows: Row[] = [];
  for (const entry of history) {
    const previous = rows.at(-1);
    if (entry.group && previous?.entries[0].group === entry.group) previous.entries.push(entry);
    else rows.push({ entries: [entry] });
  }
  return rows;
}

function time(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
