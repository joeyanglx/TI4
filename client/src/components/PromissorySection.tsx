import { promissoryText, type Action, type GameState } from '@ti4/shared';
import { allPromissoryNotes, type HeldNote } from '../players';
import { CardDetails, GiveSelect, PlayerTag } from './cardParts';

interface Props {
  state: GameState;
  players: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/**
 * Your promissory notes and the ones other players gave you. Like action cards, other players only
 * see how many you hold; notes in a play area are public.
 */
export function PromissorySection({ state, players, me, dispatch }: Props) {
  const notes = allPromissoryNotes(state, players);
  const mine = notes.filter((n) => n.owner === me && n.holder === me);
  const held = notes.filter((n) => n.owner !== me && n.holder === me && !n.inPlay);
  const inPlay = notes.filter((n) => n.owner !== me && n.holder === me && n.inPlay);
  const givenAway = notes.filter((n) => n.owner === me && n.holder !== me);

  const give = (n: HeldNote, to: string) => dispatch({ type: 'promissory/give', owner: n.owner, note: n.note.id, to });
  const text = (n: HeldNote) => (
    <CardDetails title={n.note.name} subtitle={n.owner !== me ? <PlayerTag player={n.owner} state={state} /> : undefined}>
      <p className="tech-text">{promissoryText(n.note, n.owner)}</p>
    </CardDetails>
  );

  return (
    <section>
      <h2>Promissory notes</h2>
      <h3>Your notes ({mine.length})</h3>
      {mine.map((n) => (
        <div key={n.note.id} className="card-row">
          {text(n)}
          <div className="card-actions">
            <GiveSelect players={players} exclude={me} onGive={(p) => give(n, p)} />
          </div>
        </div>
      ))}

      {held.length > 0 && <h3>From other players ({held.length})</h3>}
      {held.map((n) => (
        <div key={`${n.owner}/${n.note.id}`} className="card-row">
          {text(n)}
          <div className="card-actions">
            {n.note.playArea && (
              <button
                title="Place it face up in your play area"
                onClick={() => dispatch({ type: 'promissory/play', owner: n.owner, note: n.note.id, inPlay: true })}
              >
                Play
              </button>
            )}
            <button title={`Return it to ${n.owner}`} onClick={() => give(n, n.owner)}>
              Return
            </button>
          </div>
        </div>
      ))}

      {inPlay.length > 0 && <h3>In your play area ({inPlay.length})</h3>}
      {inPlay.map((n) => (
        <div key={`${n.owner}/${n.note.id}`} className="card-row">
          {text(n)}
          <div className="card-actions">
            <button title={`Return it to ${n.owner}`} onClick={() => give(n, n.owner)}>
              Return
            </button>
          </div>
        </div>
      ))}

      {givenAway.length > 0 && <h3>Given away ({givenAway.length})</h3>}
      {givenAway.map((n) => (
        <div key={n.note.id} className="card-row">
          {text(n)}
          <div className="card-actions muted">
            <PlayerTag player={n.holder} state={state} />
            {n.inPlay && ' (in play)'}
          </div>
        </div>
      ))}
      <p className="hint">
        Support for the Throne and Alliance go straight into the receiver's play area; Support for the Throne
        counts 1 VP for them while it's there.
      </p>
    </section>
  );
}
