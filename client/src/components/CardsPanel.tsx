import { useState, type ReactNode } from 'react';
import {
  ACTION_CARDS,
  OBJECTIVES,
  PLAYER_COLORS,
  STRATEGY_CARDS,
  isActionCard,
  randomSeed,
  type Action,
  type GameState,
} from '@ti4/shared';

interface Props {
  state: GameState;
  /** Players currently connected. */
  online: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/** Strategy cards, objectives, your hand and the decks. Card actions round-trip through the server. */
export function CardsPanel({ state, online, me, dispatch }: Props) {
  const { cards } = state;
  const players = knownPlayers(state, online, me);
  const hand = cards.hands[me] ?? [];
  const actionHand = hand.filter(isActionCard);
  const secretHand = hand.filter((id) => !isActionCard(id));
  const scoredSecrets = Object.entries(cards.scored).filter(([id]) => OBJECTIVES[id]?.type === 'secret');
  const tag = (player: string) => <PlayerTag key={player} player={player} state={state} />;

  return (
    <aside className="cards-panel">
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
                  <td className="muted" title="Action cards / secret objectives in hand">
                    {playerHand.length - secrets} AC · {secrets} SO
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
              <GiveSelect players={players} me={me} onGive={(p) => dispatch({ type: 'card/give', card: id, player: p })} />
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

      <CardSetup dispatch={dispatch} />
    </aside>
  );
}

function CardSetup({ dispatch }: { dispatch: Props['dispatch'] }) {
  const [thundersEdge, setThundersEdge] = useState(true);
  const [confirming, setConfirming] = useState(false);
  return (
    <details className="card-setup">
      <summary>New card setup</summary>
      <label className="checkbox">
        <input type="checkbox" checked={thundersEdge} onChange={(e) => setThundersEdge(e.target.checked)} />
        Include Thunder's Edge cards
      </label>
      <p className="hint">Reshuffles every deck, empties all hands and reveals two new stage I objectives.</p>
      <div className="row">
        {confirming ? (
          <>
            <button
              className="danger"
              onClick={() => {
                dispatch({ type: 'cards/setup', options: { seed: randomSeed(), thundersEdge } });
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

function CardDetails({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <details className="card-details">
      <summary>
        <span className="card-name">{title}</span>
        {subtitle && <span className="card-subtitle">{subtitle}</span>}
      </summary>
      <div className="card-text">{children}</div>
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

function GiveSelect({ players, me, onGive }: { players: string[]; me: string; onGive: (player: string) => void }) {
  const others = players.filter((p) => p !== me);
  if (!others.length) return null;
  return (
    <select value="" onChange={(e) => e.target.value && onGive(e.target.value)} title="Give to another player">
      <option value="">Give…</option>
      {others.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

function PlayerTag({ player, state }: { player: string; state: GameState }) {
  const color = state.seats[player]?.color;
  return (
    <span className="player-tag">
      <span className="player-dot" style={{ background: color ? PLAYER_COLORS[color] : 'var(--muted)' }} />
      {player}
    </span>
  );
}

/** Everyone who's online or has left a mark on the game, you first. */
function knownPlayers(state: GameState, online: string[], me: string): string[] {
  const { cards } = state;
  const names = new Set([me, ...online, ...Object.keys(state.seats)]);
  for (const [p, hand] of Object.entries(cards.hands)) if (hand.length) names.add(p);
  for (const s of cards.strategy) if (s.holder) names.add(s.holder);
  for (const scorers of Object.values(cards.scored)) scorers.forEach((p) => names.add(p));
  return [...names];
}

function victoryPoints(state: GameState, player: string): number {
  let vp = state.seats[player]?.bonusVp ?? 0;
  for (const [id, scorers] of Object.entries(state.cards.scored)) {
    if (scorers.includes(player)) vp += OBJECTIVES[id]?.points ?? 0;
  }
  return vp;
}
