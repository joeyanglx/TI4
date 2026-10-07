import { useState } from 'react';
import {
  ACTION_CARDS,
  EDITION_NAMES,
  OBJECTIVES,
  STRATEGY_CARDS,
  randomSeed,
  type Action,
  type Edition,
  type GameState,
} from '@ti4/shared';
import { CardDetails, PlayerTag } from './cardParts';

// The shared table's cards: strategy cards and objectives (in the bar over the map), the action card discard
// pile and card setup (at the bottom of the overview). Card actions round-trip through the server.

interface Props {
  state: GameState;
  /** Everyone at the table, for strategy card holders. */
  players: string[];
  me: string;
  dispatch: (action: Action) => void;
}

export function StrategySection({ state, players, dispatch }: Omit<Props, 'me'>) {
  const { cards } = state;
  return (
    <section>
      <h2>Strategy cards</h2>
      {cards.strategy.map((s) => {
        const info = STRATEGY_CARDS[s.id];
        return (
          <div key={s.id} className={`card-row ${s.exhausted ? 'exhausted' : ''}`}>
            <span className="initiative" style={{ background: info.color }}>
              {info.initiative}
            </span>
            <CardDetails title={info.name}>
              <AbilitySteps label="Primary" steps={info.primary} />
              <AbilitySteps label="Secondary" steps={info.secondary} />
            </CardDetails>
            <div className="card-actions">
              {s.tradeGoods > 0 && <span className="tg" title="Trade goods on this card">{s.tradeGoods} TG</span>}
              <select
                value={s.holder ?? ''}
                onChange={(e) => dispatch({ type: 'strategy/pick', id: s.id, player: e.target.value || undefined })}
              >
                <option value="">—</option>
                {players.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                disabled={!s.holder}
                title={s.exhausted ? 'Ready' : 'Exhaust after using it'}
                onClick={() => dispatch({ type: 'strategy/exhaust', id: s.id, exhausted: !s.exhausted })}
              >
                {s.exhausted ? 'Ready' : 'Use'}
              </button>
            </div>
          </div>
        );
      })}
      <div className="row">
        <button
          onClick={() => {
            for (const s of cards.strategy) {
              if (!s.holder) dispatch({ type: 'strategy/tradeGoods', id: s.id, amount: 1 });
            }
          }}
        >
          +1 TG on unpicked
        </button>
        <button
          disabled={!cards.strategy.some((s) => s.tradeGoods > 0)}
          title="Remove every trade good from every strategy card"
          onClick={() => dispatch({ type: 'strategy/clearTradeGoods' })}
        >
          Clear TG
        </button>
        <button onClick={() => dispatch({ type: 'strategy/returnAll' })}>Return all</button>
      </div>
      <EndRound dispatch={dispatch} />
    </section>
  );
}

export function ObjectivesSection({ state, me, dispatch }: Omit<Props, 'players'>) {
  const { cards } = state;
  const scoredSecrets = Object.entries(cards.scored).filter(([id]) => OBJECTIVES[id]?.type === 'secret');
  const tag = (player: string) => <PlayerTag key={player} player={player} state={state} />;
  return (
    <section>
      <h2>Public objectives</h2>
      {cards.revealed.map((id) => {
        const info = OBJECTIVES[id];
        const scorers = cards.scored[id] ?? [];
        const mine = scorers.includes(me);
        return (
          <div key={id} className="card-row">
            <span className={`points ${info.type}`}>{info.points}</span>
            <CardDetails title={info.name} subtitle={scorers.map(tag)}>
              <p>{info.text}</p>
              <p className="muted">
                {info.phase} phase ·{' '}
                <button className="link" onClick={() => dispatch({ type: 'card/return', card: id, seed: randomSeed() })}>
                  Put back in deck
                </button>
              </p>
            </CardDetails>
            <div className="card-actions">
              <button
                className={mine ? 'selected' : ''}
                onClick={() => dispatch({ type: 'card/score', card: id, player: me, scored: !mine })}
              >
                {mine ? 'Scored' : 'Score'}
              </button>
            </div>
          </div>
        );
      })}
      <div className="row">
        <button
          disabled={!cards.decks.stage1.length}
          onClick={() => dispatch({ type: 'cards/draw', deck: 'stage1', player: me })}
        >
          Reveal stage I ({cards.decks.stage1.length})
        </button>
        <button
          disabled={!cards.decks.stage2.length}
          onClick={() => dispatch({ type: 'cards/draw', deck: 'stage2', player: me })}
        >
          Reveal stage II ({cards.decks.stage2.length})
        </button>
      </div>
      {scoredSecrets.length > 0 && <h3>Scored secrets</h3>}
      {scoredSecrets.map(([id, [owner]]) => (
        <div key={id} className="card-row">
          <span className="points secret">{OBJECTIVES[id].points}</span>
          <CardDetails title={OBJECTIVES[id].name} subtitle={tag(owner)}>
            <p>{OBJECTIVES[id].text}</p>
          </CardDetails>
          {owner === me && (
            <div className="card-actions">
              <button onClick={() => dispatch({ type: 'card/score', card: id, player: me, scored: false })}>
                Unscore
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

export function DiscardSection({ state, me, dispatch }: Omit<Props, 'players'>) {
  const { cards } = state;
  return (
    <section>
      <h2>Discard pile ({cards.discard.length})</h2>
      {cards.discard.length > 0 && (
        <p className="last-played">
          Last played: <b>{ACTION_CARDS[cards.discard.at(-1)!].name}</b>
        </p>
      )}
      <details>
        <summary>Show all</summary>
        {[...cards.discard].reverse().map((id) => (
          <div key={id} className="card-row">
            <CardDetails title={ACTION_CARDS[id].name}>
              <p>{ACTION_CARDS[id].text}</p>
            </CardDetails>
            <div className="card-actions">
              <button onClick={() => dispatch({ type: 'card/give', card: id, player: me })}>Take</button>
            </div>
          </div>
        ))}
      </details>
      <div className="row">
        <button
          disabled={!cards.discard.length}
          onClick={() => dispatch({ type: 'cards/reshuffle', seed: randomSeed() })}
        >
          Shuffle discards into deck
        </button>
      </div>
    </section>
  );
}

/** Status phase in one click, after a confirmation since it touches everyone's planets and tokens. */
function EndRound({ dispatch }: { dispatch: Props['dispatch'] }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="row end-round">
      {confirming ? (
        <>
          <span className="muted">Ready all planets and technologies, remove all command tokens from the board, return strategy cards?</span>
          <button
            className="primary"
            onClick={() => {
              dispatch({ type: 'round/end' });
              setConfirming(false);
            }}
          >
            Yes, end the round
          </button>
          <button onClick={() => setConfirming(false)}>Cancel</button>
        </>
      ) : (
        <button
          title="Ready every controlled planet and technology, take every command token off the board and return all strategy cards"
          onClick={() => setConfirming(true)}
        >
          End round…
        </button>
      )}
    </div>
  );
}

export function CardSetup({ edition, dispatch }: { edition: Edition; dispatch: Props['dispatch'] }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <details className="card-setup">
      <summary>Card setup · {EDITION_NAMES[edition]}</summary>
      <p className="hint">
        Starts the cards over: reshuffles every deck, empties all hands, clears laws and relics, and reveals two new
        stage I objectives. Change the game version with the switch in the top bar.
      </p>
      <div className="row">
        {confirming ? (
          <>
            <button
              className="danger"
              onClick={() => {
                dispatch({ type: 'cards/setup', options: { seed: randomSeed(), edition } });
                setConfirming(false);
              }}
            >
              Yes, reset all cards
            </button>
            <button onClick={() => setConfirming(false)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)}>Reset cards…</button>
        )}
      </div>
    </details>
  );
}

function AbilitySteps({ label, steps }: { label: string; steps: string[] }) {
  return (
    <>
      <p>
        <b>{label}</b>
      </p>
      <ul>
        {steps.map((step) => (
          <li key={step}>{/[.)]$/.test(step) ? step : `${step}.`}</li>
        ))}
      </ul>
    </>
  );
}
