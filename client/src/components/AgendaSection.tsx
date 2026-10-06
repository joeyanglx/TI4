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
  const [peeking, setPeeking] = useState(false);
  const deck = cards.decks.agenda;
  const top = deck.slice(-2).reverse();

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
        <button className={peeking ? 'selected' : ''} disabled={!deck.length} onClick={() => setPeeking(!peeking)}>
          {peeking ? 'Hide top 2' : 'Look at top 2'}
        </button>
      </div>
      {peeking && (
        <div className="peek">
          <p className="hint">Only you see these. Top of the deck first.</p>
          {top.map((id, i) => (
            <div key={id} className="card-row">
              <AgendaBadge id={id} />
              <AgendaText id={id} />
              <div className="card-actions">
                {i > 0 && (
                  <button onClick={() => dispatch({ type: 'card/return', card: id, seed: 0, position: 'top' })}>
                    Top
                  </button>
                )}
                <button onClick={() => dispatch({ type: 'card/return', card: id, seed: 0, position: 'bottom' })}>
                  Bottom
                </button>
              </div>
            </div>
          ))}
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
