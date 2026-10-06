import { RELICS, type Action, type GameState } from '@ti4/shared';
import { CardDetails, GiveSelect, PlayerTag } from './cardParts';

interface Props {
  state: GameState;
  players: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/** Relics are public: each one sits face up in its owner's play area. */
export function RelicSection({ state, players, me, dispatch }: Props) {
  const { cards } = state;
  const owned = Object.entries(cards.relics).flatMap(([owner, ids]) => ids.map((id) => ({ owner, id })));
  const purgedRelics = cards.purged.filter((id) => id in RELICS);

  return (
    <section>
      <h2>Relics</h2>
      {owned.map(({ owner, id }) => {
        const exhausted = cards.exhaustedRelics.includes(id);
        return (
          <div key={id} className={`card-row ${exhausted ? 'exhausted' : ''}`}>
            <CardDetails title={RELICS[id].name} subtitle={<PlayerTag player={owner} state={state} />}>
              <p>{RELICS[id].text}</p>
            </CardDetails>
            <div className="card-actions">
              <GiveSelect
                players={players}
                exclude={owner}
                onGive={(p) => dispatch({ type: 'card/give', card: id, player: p })}
              />
              <button onClick={() => dispatch({ type: 'relic/exhaust', card: id, exhausted: !exhausted })}>
                {exhausted ? 'Ready' : 'Exhaust'}
              </button>
              <button onClick={() => dispatch({ type: 'card/purge', card: id })} title="Remove from the game">
                Purge
              </button>
            </div>
          </div>
        );
      })}
      <div className="row">
        <button
          disabled={!cards.decks.relic.length}
          onClick={() => dispatch({ type: 'cards/draw', deck: 'relic', player: me })}
        >
          Gain relic ({cards.decks.relic.length})
        </button>
      </div>
      <p className="hint">Points from relics and agendas go in the scoreboard's +/−.</p>
      {purgedRelics.length > 0 && (
        <details>
          <summary>Purged ({purgedRelics.length})</summary>
          {purgedRelics.map((id) => (
            <div key={id} className="card-row">
              <CardDetails title={RELICS[id].name}>
                <p>{RELICS[id].text}</p>
              </CardDetails>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
