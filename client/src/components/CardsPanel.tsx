import {
  ACTION_CARDS,
  OBJECTIVES,
  isActionCard,
  randomSeed,
  seatOf,
  type Action,
  type GameState,
} from '@ti4/shared';
import { knownPlayers, victoryPoints } from '../players';
import { CardDetails, GiveSelect } from './cardParts';
import { TechSection, TokenSection } from './CommandSheet';
import { EconomySection } from './EconomySection';
import { FactionSection } from './FactionSection';
import { YourPlanets } from './PlanetSection';
import { PromissorySection } from './PromissorySection';

interface Props {
  state: GameState;
  /** Players currently connected. */
  online: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/**
 * Your player board: faction, trade goods and commodities, hand, promissory notes, planets, command tokens and
 * technologies. The shared table's cards are in the bar over the map (TableBar). Card actions round-trip through
 * the server.
 */
export function CardsPanel({ state, online, me, dispatch }: Props) {
  const { cards } = state;
  const players = knownPlayers(state, online, me);
  const hand = cards.hands[me] ?? [];
  const actionHand = hand.filter(isActionCard);
  const secretHand = hand.filter((id) => !isActionCard(id));

  return (
    <div className="cards-panel">
      <FactionSection state={state} me={me} dispatch={dispatch} />
      <section>
        <h2>Victory points</h2>
        <div className="counter-row">
          <span>
            <b>{victoryPoints(state, me)}</b> VP{' '}
            <span className="muted">
              (other points: {seatOf(state.seats, me).bonusVp} · custodians, agendas, relics, Imperial)
            </span>
          </span>
          <span className="counter">
            <button onClick={() => dispatch({ type: 'seat/bonusVp', player: me, amount: -1 })}>−</button>
            <button onClick={() => dispatch({ type: 'seat/bonusVp', player: me, amount: 1 })}>+</button>
          </span>
        </div>
      </section>
      <EconomySection state={state} players={players} me={me} dispatch={dispatch} />
      <section>
        <h2>Your hand</h2>
        <p className="hint">Other players only see how many cards you hold.</p>
        <h3>Action cards ({actionHand.length})</h3>
        {actionHand.map((id) => (
          <div key={id} className="card-row">
            <CardDetails title={ACTION_CARDS[id].name} subtitle={ACTION_CARDS[id].phase}>
              <p className="muted">{ACTION_CARDS[id].window}:</p>
              <p>{ACTION_CARDS[id].text}</p>
            </CardDetails>
            <div className="card-actions">
              <GiveSelect players={players} exclude={me} onGive={(p) => dispatch({ type: 'card/give', card: id, player: p })} />
              <button onClick={() => dispatch({ type: 'card/discard', card: id })} title="Play or discard">
                Play
              </button>
            </div>
          </div>
        ))}
        <h3>Secret objectives ({secretHand.length})</h3>
        {secretHand.map((id) => (
          <div key={id} className="card-row">
            <CardDetails title={OBJECTIVES[id].name} subtitle={`${OBJECTIVES[id].phase} phase`}>
              <p>{OBJECTIVES[id].text}</p>
              <p>
                <button className="link" onClick={() => dispatch({ type: 'card/return', card: id, seed: randomSeed() })}>
                  Shuffle back into the deck
                </button>
              </p>
            </CardDetails>
            <div className="card-actions">
              <button onClick={() => dispatch({ type: 'card/score', card: id, player: me, scored: true })}>Score</button>
            </div>
          </div>
        ))}
        <div className="row">
          <button
            disabled={!cards.decks.action.length}
            onClick={() => dispatch({ type: 'cards/draw', deck: 'action', player: me })}
          >
            Draw action card ({cards.decks.action.length})
          </button>
          <button
            disabled={!cards.decks.secret.length}
            onClick={() => dispatch({ type: 'cards/draw', deck: 'secret', player: me })}
          >
            Draw secret ({cards.decks.secret.length})
          </button>
        </div>
      </section>
      <PromissorySection state={state} players={players} me={me} dispatch={dispatch} />
      <YourPlanets state={state} players={players} me={me} dispatch={dispatch} />
      <TokenSection state={state} me={me} players={players} dispatch={dispatch} />
      <TechSection state={state} me={me} dispatch={dispatch} />
    </div>
  );
}
