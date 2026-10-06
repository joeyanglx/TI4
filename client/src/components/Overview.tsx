import {
  EDITION_NAMES,
  FACTIONS,
  PLANETS,
  PLAYER_COLORS,
  STRATEGY_CARDS,
  TECHNOLOGIES,
  TOKEN_POOLS,
  isActionCard,
  reinforcements,
  seatOf,
  type Action,
  type GameState,
  type TokenPool,
} from '@ti4/shared';
import type { DragEvent } from 'react';
import { TOKEN_MIME, type TokenDrag } from '../dnd';
import { knownPlayers, victoryPoints } from '../players';
import { FactionIcon } from './cardParts';
import { TECH_TYPES, techTooltip } from '../techs';

/** Points needed to win in a standard game. */
const VP_TO_WIN = 10;

interface Props {
  state: GameState;
  room: string;
  online: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/**
 * Summary of every player, in the style of Twilight Wars' info panel. Command tokens and the speaker
 * token can be dragged between the panel and the map.
 */
export function Overview({ state, room, online, me, dispatch }: Props) {
  const players = knownPlayers(state, online, me);
  const speakerOnMap = Object.values(state.pieces).some((p) => p.kind === 'speaker');
  return (
    <div className="overview">
      <header className="overview-header">
        <div>
          <strong>Room {room}</strong>
          <div className="muted">{EDITION_NAMES[state.cards.edition]}</div>
        </div>
        <div className="speaker-status">
          {state.speaker ? null : speakerOnMap ? (
            <span className="muted">Speaker token is on the map</span>
          ) : (
            <>
              <span className="muted">Drag to a player:</span>
              <SpeakerBadge player="" />
            </>
          )}
        </div>
      </header>
      {players.map((p) => (
        <PlayerOverview key={p} state={state} player={p} online={online.includes(p)} dispatch={dispatch} />
      ))}
      <p className="hint">
        Drag command tokens between pools or onto the map, and drag tokens on the map back onto a pool. Drag the
        speaker token to another player or onto the map.
      </p>
    </div>
  );
}

interface PlayerProps {
  state: GameState;
  player: string;
  online: boolean;
  dispatch: (action: Action) => void;
}

function PlayerOverview({ state, player, online, dispatch }: PlayerProps) {
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
    <article
      className="player-overview"
      style={{ borderLeftColor: color }}
      // Dropping the speaker token anywhere on a player's card hands it to them.
      data-token-slot="speaker"
      data-player={player}
      onDragOver={acceptTokens}
      onDrop={(e) => {
        const drag = readDrag(e);
        if (drag?.from === 'speaker') dispatch({ type: 'speaker/set', player });
      }}
    >
      <div className="po-header">
        {seat.faction ? (
          <FactionIcon faction={seat.faction} size={34} />
        ) : (
          <span className="player-dot big" style={{ background: color }} />
        )}
        <div className="po-name">
          <strong>{player}</strong>
          <div className="muted">
            {seat.faction && `${FACTIONS[seat.faction]?.name} · `}
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
        {state.speaker === player && <SpeakerBadge player={player} />}
        <span className="po-vp" title="Victory points">
          {victoryPoints(state, player)} / {VP_TO_WIN}
        </span>
      </div>

      <div className="po-tokens">
        {TOKEN_POOLS.map((pool) => (
          <Token key={pool} player={player} slot={pool} color={color} count={seat.tokens[pool]} dispatch={dispatch} />
        ))}
        <Token player={player} slot="reinforcements" color={color} count={left} dispatch={dispatch} />
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

interface TokenProps {
  player: string;
  slot: TokenPool | 'reinforcements';
  color: string;
  count: number;
  dispatch: (action: Action) => void;
}

/** A command token pool: drag tokens out of it onto the map or another pool, or drop them back in. */
function Token({ player, slot, color, count, dispatch }: TokenProps) {
  return (
    <div
      className={`po-token ${count > 0 ? 'draggable' : ''}`}
      title={`${slot}: ${count}`}
      draggable={count > 0}
      onDragStart={(e) => startDrag(e, { player, from: slot })}
      data-token-slot={slot}
      data-player={player}
      onDragOver={acceptTokens}
      onDrop={(e) => {
        const drag = readDrag(e);
        if (!drag || drag.from === 'speaker') return; // the card handles the speaker
        e.stopPropagation();
        // Moving tokens between your own pools; reinforcements adjust by themselves.
        if (drag.player !== player || drag.from === slot) return;
        if (drag.from !== 'reinforcements') dispatch({ type: 'seat/tokens', player, pool: drag.from, amount: -1 });
        if (slot !== 'reinforcements') dispatch({ type: 'seat/tokens', player, pool: slot, amount: 1 });
      }}
    >
      <span className="triangle" style={{ borderBottomColor: color }}>
        <b>{count}</b>
      </span>
      <small>{slot}</small>
    </div>
  );
}

function SpeakerBadge({ player }: { player: string }) {
  return (
    <span
      className="speaker-badge"
      title="Speaker token: drag it to another player or onto the map"
      draggable
      onDragStart={(e) => startDrag(e, { player, from: 'speaker' })}
    >
      SPEAKER
    </span>
  );
}

function startDrag(e: DragEvent, drag: TokenDrag) {
  e.dataTransfer.setData(TOKEN_MIME, JSON.stringify(drag));
  e.dataTransfer.effectAllowed = 'move';
}

function acceptTokens(e: DragEvent) {
  if (e.dataTransfer.types.includes(TOKEN_MIME)) e.preventDefault();
}

function readDrag(e: DragEvent): TokenDrag | undefined {
  const data = e.dataTransfer.getData(TOKEN_MIME);
  if (!data) return undefined;
  e.preventDefault();
  return JSON.parse(data) as TokenDrag;
}

function Count({ value, label, className }: { value: number | string; label: string; className: string }) {
  return (
    <div className="po-count" title={label}>
      <span className={`po-icon ${className}`}>{value}</span>
      <small>{label}</small>
    </div>
  );
}
