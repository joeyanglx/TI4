import { useState } from 'react';
import {
  EDITION_NAMES,
  FACTIONS,
  PLANETS,
  PLAYER_COLORS,
  STRATEGY_CARDS,
  TECHNOLOGIES,
  isActionCard,
  seatOf,
  type Action,
  type GameState,
} from '@ti4/shared';
import { allPromissoryNotes, knownPlayers, victoryPoints } from '../players';
import { FactionIcon } from './cardParts';
import { FactionSheet } from './FactionSheet';
import { CardSetup, DiscardSection } from './TablePanels';
import { SpeakerBadge, TokenPools } from './TokenPools';
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
 * Summary of every player, in the style of Twilight Wars' info panel, with the action card discard pile and card
 * setup at the bottom. Tokens are moved on each player's own board; this shows everyone the result.
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
          {!state.speaker && (
            <span className="muted">{speakerOnMap ? 'Speaker token is on the map' : 'No speaker yet'}</span>
          )}
        </div>
      </header>
      {players.map((p) => (
        <PlayerOverview key={p} state={state} player={p} players={players} online={online.includes(p)} />
      ))}
      <div className="cards-panel">
        <DiscardSection state={state} me={me} dispatch={dispatch} />
        <CardSetup key={state.cards.edition} edition={state.cards.edition} dispatch={dispatch} />
      </div>
    </div>
  );
}

interface PlayerProps {
  state: GameState;
  player: string;
  /** Everyone at the table, to find whose promissory notes this player holds. */
  players: string[];
  online: boolean;
}

function PlayerOverview({ state, player, players, online }: PlayerProps) {
  const seat = seatOf(state.seats, player);
  const [showSheet, setShowSheet] = useState(false);
  const color = seat.color ? PLAYER_COLORS[seat.color] : 'var(--muted)';
  const { cards } = state;
  const hand = cards.hands[player] ?? [];
  const actionCards = hand.filter(isActionCard).length;
  const strategy = cards.strategy.filter((s) => s.holder === player);
  const notes = allPromissoryNotes(state, players).filter((n) => n.holder === player);
  const notesInHand = notes.filter((n) => !n.inPlay).length;
  const playArea = notes.filter((n) => n.inPlay);
  const planets = Object.entries(state.planets)
    .filter(([name, p]) => p.owner === player && PLANETS[name])
    .sort(([a], [b]) => a.localeCompare(b));
  const sum = (key: 'resources' | 'influence', readyOnly: boolean) =>
    planets.reduce((n, [name, p]) => (readyOnly && p.exhausted ? n : n + PLANETS[name][key]), 0);

  return (
    <article className="player-overview" style={{ borderLeftColor: color }}>
      {showSheet && seat.faction && (
        <FactionSheet faction={seat.faction} edition={cards.edition} onClose={() => setShowSheet(false)} />
      )}
      <div className="po-header">
        {seat.faction ? (
          <FactionIcon faction={seat.faction} size={34} />
        ) : (
          <span className="player-dot big" style={{ background: color }} />
        )}
        <div className="po-name">
          <strong>{player}</strong>
          <div className="muted po-faction">
            {seat.faction && (
              <>
                {FACTIONS[seat.faction]?.name}
                <button className="info-button" title="Faction sheet" onClick={() => setShowSheet(true)}>
                  i
                </button>
                {' · '}
              </>
            )}
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
        {seat.passed && <span className="passed-badge">PASSED</span>}
        {state.speaker === player && <SpeakerBadge player={player} />}
        <span className="po-vp" title="Victory points">
          {victoryPoints(state, player)} / {VP_TO_WIN}
        </span>
      </div>

      <TokenPools state={state} player={player} />

      <div className="po-counts">
        <Count value={seat.tradeGoods} label="Trade goods" className="tg" />
        <Count value={`${seat.commodities}/${seat.commodityMax}`} label="Commodities" className="commodity" />
        <Count value={actionCards} label="Action cards" className="action-card" />
        <Count value={hand.length - actionCards} label="Secret objectives" className="secret-card" />
        <Count value={notesInHand} label="Promissory notes" className="promissory-card" />
        {cards.edition !== 'base' && (
          <Count value={cards.relics[player]?.length ?? 0} label="Relics" className="relic-card" />
        )}
      </div>

      {playArea.length > 0 && (
        <div className="po-block">
          <h4>Play area</h4>
          <div className="po-names">
            {playArea.map((n) => (
              <span key={`${n.owner}/${n.note.id}`} className="ready" title={`${n.owner}'s ${n.note.name}`}>
                {n.note.name} ({n.owner})
              </span>
            ))}
          </div>
        </div>
      )}

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

function Count({ value, label, className }: { value: number | string; label: string; className: string }) {
  return (
    <div className="po-count" title={label}>
      <span className={`po-icon ${className}`}>{value}</span>
      <small>{label}</small>
    </div>
  );
}
