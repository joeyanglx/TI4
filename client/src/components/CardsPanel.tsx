import { useState } from 'react';
import {
  ACTION_CARDS,
  EDITION_NAMES,
  OBJECTIVES,
  STRATEGY_CARDS,
  isActionCard,
  randomSeed,
  seatOf,
  type Action,
  type Edition,
  type GameState,
} from '@ti4/shared';
import { knownPlayers, victoryPoints } from '../players';
import { AgendaSection } from './AgendaSection';
import { CardDetails, GiveSelect, PlayerTag } from './cardParts';
import { TechSection, TokenSection } from './CommandSheet';
import { EconomySection } from './EconomySection';
import { FactionSection } from './FactionSection';
import { AllPlanets, YourPlanets } from './PlanetSection';
import { RelicSection } from './RelicSection';

interface Props {
  state: GameState;
  /** Players currently connected. */
  online: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/**
 * Game tab: the shared table (scores, strategy cards, objectives, agendas, relics, planets).
 * You tab: your trade goods and commodities, hand and planets. Card actions round-trip through the server.
 */
export function CardsPanel({ state, online, me, dispatch }: Props) {
  const { cards } = state;
  const players = knownPlayers(state, online, me);
  const hand = cards.hands[me] ?? [];
  const actionHand = hand.filter(isActionCard);
  const secretHand = hand.filter((id) => !isActionCard(id));
  const scoredSecrets = Object.entries(cards.scored).filter(([id]) => OBJECTIVES[id]?.type === 'secret');
  const tag = (player: string) => <PlayerTag key={player} player={player} state={state} />;
  const [tab, setTab] = useState<'game' | 'you'>('game');

  return (
    <aside className="cards-panel">
      <div className="tabs panel-tabs">
        <button className={tab === 'game' ? 'selected' : ''} onClick={() => setTab('game')}>
          Game
        </button>
        <button className={tab === 'you' ? 'selected' : ''} onClick={() => setTab('you')}>
          You
        </button>
      </div>
      {tab === 'you' ? (
        <>
          <FactionSection state={state} me={me} dispatch={dispatch} />
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
          <YourPlanets state={state} players={players} me={me} dispatch={dispatch} />
          <TokenSection state={state} me={me} dispatch={dispatch} />
          <TechSection state={state} me={me} dispatch={dispatch} />
        </>
      ) : (
        <>
          <section>
            <h2>Scores</h2>
            <table className="scores">
              <tbody>
                {players.map((p) => {
                  const playerHand = cards.hands[p] ?? [];
                  const secrets = playerHand.filter((id) => !isActionCard(id)).length;
                  return (
                    <tr key={p}>
                      <td>{tag(p)}</td>
                      <td className="muted" title="Action cards and secret objectives in hand, trade goods, commodities">
                        {playerHand.length - secrets} AC · {secrets} SO · {seatOf(state.seats, p).tradeGoods} TG ·{' '}
                        {seatOf(state.seats, p).commodities} C
                      </td>
                      <td className="vp" title="Victory points">
                        {victoryPoints(state, p)}
                      </td>
                      <td className="stepper" title="Other points: custodians, agendas, relics, Imperial">
                        <button onClick={() => dispatch({ type: 'seat/bonusVp', player: p, amount: -1 })}>−</button>
                        <button onClick={() => dispatch({ type: 'seat/bonusVp', player: p, amount: 1 })}>+</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

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
              <button onClick={() => dispatch({ type: 'strategy/returnAll' })}>Return all</button>
            </div>
          </section>

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

          <AgendaSection state={state} players={players} dispatch={dispatch} />
          {cards.edition !== 'base' && <RelicSection state={state} players={players} me={me} dispatch={dispatch} />}
          <AllPlanets state={state} />

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

          <CardSetup key={cards.edition} edition={cards.edition} dispatch={dispatch} />
        </>
      )}
    </aside>
  );
}

function CardSetup({ edition, dispatch }: { edition: Edition; dispatch: Props['dispatch'] }) {
  const [baseOnly, setBaseOnly] = useState(edition === 'base');
  const [thundersEdge, setThundersEdge] = useState(edition !== 'pok');
  const [confirming, setConfirming] = useState(false);
  const chosen: Edition = baseOnly ? 'base' : thundersEdge ? 'te' : 'pok';
  return (
    <details className="card-setup">
      <summary>Card setup · {EDITION_NAMES[edition]}</summary>
      <label className="checkbox">
        <input type="checkbox" checked={baseOnly} onChange={(e) => setBaseOnly(e.target.checked)} />
        Base game only (no Prophecy of Kings or Thunder's Edge cards, no relics)
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={thundersEdge && !baseOnly}
          disabled={baseOnly}
          onChange={(e) => setThundersEdge(e.target.checked)}
        />
        Include Thunder's Edge cards
      </label>
      <p className="hint">
        Starts the game's cards over with {EDITION_NAMES[chosen]}: reshuffles every deck, empties all hands, clears
        laws and relics, and reveals two new stage I objectives.
      </p>
      <div className="row">
        {confirming ? (
          <>
            <button
              className="danger"
              onClick={() => {
                dispatch({ type: 'cards/setup', options: { seed: randomSeed(), edition: chosen } });
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
