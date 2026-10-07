import { useState } from 'react';
import { AGENDAS, SYSTEMS, randomSeed, type Action, type GameState, type Law } from '@ti4/shared';
import { CardDetails } from './cardParts';

const PLANET_NAMES = [...new Set(Object.values(SYSTEMS).flatMap((s) => s.planets.map((p) => p.name)))].sort();

interface Props {
  state: GameState;
  players: string[];
  dispatch: (action: Action) => void;
}

/** Agendas up for a vote, laws in play, and the Politics card's look at the top of the deck. */
export function AgendaSection({ state, players, dispatch }: Props) {
  const { cards } = state;
  // The two cards you looked at, fixed when you looked: putting one on the bottom mustn't show you the next one.
  const [peeked, setPeeked] = useState<string[] | null>(null);
  const deck = cards.decks.agenda;
  // A card someone has since revealed isn't yours to arrange any more.
  const looking = peeked?.filter((id) => deck.includes(id));

  return (
    <section>
      <h2>Agendas</h2>
      {cards.voting.map((id) => {
        const info = AGENDAS[id];
        return (
          <div key={id} className="card-row">
            <AgendaBadge id={id} />
            <AgendaText id={id} />
            <div className="card-actions">
              {info.type === 'law' && (
                <button onClick={() => dispatch({ type: 'agenda/enact', card: id })} title="The law passes">
                  Enact
                </button>
              )}
              <button
                onClick={() => dispatch({ type: 'card/discard', card: id })}
                title={info.type === 'law' ? 'The law fails' : 'Resolved'}
              >
                Discard
              </button>
            </div>
          </div>
        );
      })}
      <div className="row">
        <button
          disabled={!deck.length}
          onClick={() => dispatch({ type: 'cards/draw', deck: 'agenda', player: '' })}
        >
          Reveal agenda ({deck.length})
        </button>
        <button
          className={peeked ? 'selected' : ''}
          disabled={!peeked && !deck.length}
          onClick={() => setPeeked(peeked ? null : deck.slice(-2).reverse())}
        >
          {peeked ? 'Done' : 'Look at top 2'}
        </button>
      </div>
      {looking && (
        <div className="peek">
          <p className="hint">Only you see these two. Put each on the top or bottom of the deck, then press Done.</p>
          {looking.map((id) => (
            <div key={id} className="card-row">
              <AgendaBadge id={id} />
              <AgendaText id={id} />
              <div className="card-actions">
                <span className="muted">{deckPosition(deck, id)}</span>
                <button onClick={() => dispatch({ type: 'card/return', card: id, seed: 0, position: 'top' })}>
                  Top
                </button>
                <button onClick={() => dispatch({ type: 'card/return', card: id, seed: 0, position: 'bottom' })}>
                  Bottom
                </button>
              </div>
            </div>
          ))}
          {looking.length === 0 && <p className="hint">Both have been revealed since you looked.</p>}
        </div>
      )}

      <h3>Laws in play ({cards.laws.length})</h3>
      {cards.laws.map((law) => (
        <div key={law.id} className="card-row">
          <AgendaBadge id={law.id} />
          <AgendaText id={law.id} />
          <div className="card-actions">
            <ElectedInput key={law.elected ?? ''} law={law} players={players} dispatch={dispatch} />
            <button onClick={() => dispatch({ type: 'card/discard', card: law.id })} title="Discard the law">
              Repeal
            </button>
          </div>
        </div>
      ))}

      {cards.agendaDiscard.length > 0 && (
        <details>
          <summary>Discarded agendas ({cards.agendaDiscard.length})</summary>
          {[...cards.agendaDiscard].reverse().map((id) => (
            <div key={id} className="card-row">
              <AgendaBadge id={id} />
              <AgendaText id={id} />
              <div className="card-actions">
                <button
                  onClick={() => dispatch({ type: 'card/return', card: id, seed: randomSeed() })}
                  title="Shuffle back into the agenda deck"
                >
                  Return
                </button>
              </div>
            </div>
          ))}
        </details>
      )}
      <datalist id="planet-names">
        {PLANET_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </section>
  );
}

/** Where a card sits in the deck (the last entry is the top). */
function deckPosition(deck: string[], id: string): string {
  const index = deck.indexOf(id);
  if (index === deck.length - 1) return 'on top';
  if (index === deck.length - 2) return '2nd from top';
  if (index === 0) return 'on the bottom';
  return `${deck.length - index}th from top`;
}

function AgendaBadge({ id }: { id: string }) {
  const law = AGENDAS[id].type === 'law';
  return (
    <span className={`points ${law ? 'law' : 'directive'}`} title={law ? 'Law' : 'Directive'}>
      {law ? 'L' : 'D'}
    </span>
  );
}

function AgendaText({ id }: { id: string }) {
  const info = AGENDAS[id];
  const [target, revealRule] = splitTarget(info.target);
  const elect = target.startsWith('Elect');
  return (
    <CardDetails title={info.name} subtitle={target}>
      {revealRule && <p className="muted">{revealRule}</p>}
      <p>
        <b>{elect ? 'Elected:' : 'For:'}</b> {info.for}
      </p>
      {info.against && (
        <p>
          <b>Against:</b> {info.against}
        </p>
      )}
    </CardDetails>
  );
}

/** "Elect Law (When this agenda is revealed, ...)" -> ["Elect Law", "When this agenda is revealed, ..."] */
function splitTarget(target: string): [string, string | undefined] {
  const match = /^(.*?)\s*\((.*)\)$/.exec(target);
  return match ? [match[1], match[2]] : [target, undefined];
}

function ElectedInput({ law, players, dispatch }: { law: Law; players: string[]; dispatch: Props['dispatch'] }) {
  const [target] = splitTarget(AGENDAS[law.id].target);
  const [draft, setDraft] = useState(law.elected ?? '');
  if (!target.startsWith('Elect')) return null;
  const elect = (elected: string) => dispatch({ type: 'agenda/elect', card: law.id, elected: elected || undefined });

  if (target === 'Elect Player') {
    return (
      <select value={law.elected ?? ''} onChange={(e) => elect(e.target.value)} title="Elected player">
        <option value="">Elected…</option>
        {players.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      className="elected"
      placeholder="Elected…"
      title={target}
      list={target.includes('Planet') ? 'planet-names' : undefined}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== (law.elected ?? '') && elect(draft.trim())}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}
