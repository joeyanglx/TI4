import {
  EDITION_NAMES,
  PLANETS,
  PLAYER_COLORS,
  STRATEGY_CARDS,
  TECHNOLOGIES,
  TOKEN_POOLS,
  isActionCard,
  seatOf,
  type GameState,
} from '@ti4/shared';
import { knownPlayers, reinforcements, victoryPoints } from '../players';
import { TECH_TYPES, techTooltip } from '../techs';

/** Points needed to win in a standard game. */
const VP_TO_WIN = 10;

interface Props {
  state: GameState;
  room: string;
  online: string[];
  me: string;
  onClose: () => void;
}

/** Read-only summary of every player, in the style of Twilight Wars' info panel. */
export function Overview({ state, room, online, me, onClose }: Props) {
  const players = knownPlayers(state, online, me);
  return (
    <aside className="overview">
      <header className="overview-header">
        <div>
          <strong>Room {room}</strong>
          <div className="muted">{EDITION_NAMES[state.cards.edition]}</div>
        </div>
        <button onClick={onClose} title="Close">
          ×
        </button>
      </header>
      {players.map((p) => (
        <PlayerOverview key={p} state={state} player={p} online={online.includes(p)} />
      ))}
    </aside>
  );
}

function PlayerOverview({ state, player, online }: { state: GameState; player: string; online: boolean }) {
  const seat = seatOf(state.seats, player);
  const color = seat.color ? PLAYER_COLORS[seat.color] : 'var(--muted)';
  const { cards } = state;
  const hand = cards.hands[player] ?? [];
  const actionCards = hand.filter(isActionCard).length;
  const strategy = cards.strategy.filter((s) => s.holder === player);
  const planets = Object.entries(state.planets)
    .filter(([name, p]) => p.owner === player && PLANETS[name])
    .sort(([a], [b]) => a.localeCompare(b));
  const sum = (key: 'resources' | 'influence', readyOnly: boolean) =>
    planets.reduce((n, [name, p]) => (readyOnly && p.exhausted ? n : n + PLANETS[name][key]), 0);
  const left = reinforcements(state, player);

  return (
    <article className="player-overview" style={{ borderLeftColor: color }}>
      <div className="po-header">
        <span className="player-dot big" style={{ background: color }} />
        <div className="po-name">
          <strong>{player}</strong>
          <div className="muted">{online ? 'Online' : 'Offline'}</div>
        </div>
        <span className="po-vp" title="Victory points">
          {victoryPoints(state, player)} / {VP_TO_WIN}
        </span>
      </div>

      <div className="po-tokens">
        {TOKEN_POOLS.map((pool) => (
          <Token key={pool} color={color} count={seat.tokens[pool]} label={pool} />
        ))}
        <Token color={color} count={left} label="reinforcements" />
      </div>

      <div className="po-counts">
        <Count value={seat.tradeGoods} label="Trade goods" className="tg" />
        <Count value={`${seat.commodities}/${seat.commodityMax}`} label="Commodities" className="commodity" />
        <Count value={actionCards} label="Action cards" className="action-card" />
        <Count value={hand.length - actionCards} label="Secret objectives" className="secret-card" />
        {cards.edition !== 'base' && (
          <Count value={cards.relics[player]?.length ?? 0} label="Relics" className="relic-card" />
        )}
      </div>

      <div className="po-block">
        <h4>Strategy cards</h4>
        <div className="po-names">
          {strategy.length === 0 && <span className="muted">None</span>}
          {strategy.map((s) => (
            <span key={s.id} className={s.exhausted ? 'used' : 'ready'} title={s.exhausted ? 'Used' : 'Ready'}>
              {STRATEGY_CARDS[s.id].name}
            </span>
          ))}
        </div>
      </div>

      <div className="po-block">
        <h4>
          Technology cards
          {TECH_TYPES.map(({ type, color: techColor }) => (
            <span key={type} className="tech-count" style={{ background: techColor }} title={type}>
              {seat.technologies.filter((id) => TECHNOLOGIES[id]?.type === type).length}
            </span>
          ))}
        </h4>
        <div className="po-names">
          {seat.technologies.length === 0 && <span className="muted">None</span>}
          {seat.technologies
            .filter((id) => TECHNOLOGIES[id])
            .map((id) => (
              <span
                key={id}
                className={seat.exhaustedTechnologies.includes(id) ? 'used' : 'ready'}
                title={techTooltip(id)}
              >
                {TECHNOLOGIES[id].name}
              </span>
            ))}
        </div>
      </div>

      <div className="po-block">
        <h4>
          Planet cards
          <span className="res" title="Ready / total resources">
            {sum('resources', true)}/{sum('resources', false)}
          </span>
          <span className="inf" title="Ready / total influence">
            {sum('influence', true)}/{sum('influence', false)}
          </span>
        </h4>
        <div className="po-names">
          {planets.length === 0 && <span className="muted">None</span>}
          {planets.map(([name, p]) => (
            <span
              key={name}
              className={p.exhausted ? 'used' : 'ready'}
              title={`${name}: ${PLANETS[name].resources} resources, ${PLANETS[name].influence} influence${p.exhausted ? ' (exhausted)' : ''}`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function Token({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <div className="po-token" title={`${label}: ${count}`}>
      <span className="triangle" style={{ borderBottomColor: color }}>
        <b>{count}</b>
      </span>
      <small>{label}</small>
    </div>
  );
}

function Count({ value, label, className }: { value: number | string; label: string; className: string }) {
  return (
    <div className="po-count" title={label}>
      <span className={`po-icon ${className}`}>{value}</span>
      <small>{label}</small>
    </div>
  );
}
