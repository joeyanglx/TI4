import type { DragEvent } from 'react';
import {
  PLAYER_COLORS,
  TOKEN_POOLS,
  reinforcements,
  seatOf,
  type Action,
  type GameState,
  type TokenPool,
} from '@ti4/shared';
import { TOKEN_MIME, type TokenDrag } from '../dnd';

interface PoolsProps {
  state: GameState;
  player: string;
  /** Given on your own player board: tokens can then be dragged. Without it the pools are display only. */
  dispatch?: (action: Action) => void;
}

/** A player's command sheet pools and reinforcements, drawn as command tokens in their colour. */
export function TokenPools({ state, player, dispatch }: PoolsProps) {
  const seat = seatOf(state.seats, player);
  const color = seat.color ? PLAYER_COLORS[seat.color] : 'var(--muted)';
  return (
    <div className="po-tokens">
      {TOKEN_POOLS.map((pool) => (
        <Token key={pool} player={player} slot={pool} color={color} count={seat.tokens[pool]} dispatch={dispatch} />
      ))}
      <Token player={player} slot="reinforcements" color={color} count={reinforcements(state, player)} dispatch={dispatch} />
    </div>
  );
}

interface TokenProps {
  player: string;
  slot: TokenPool | 'reinforcements';
  color: string;
  count: number;
  dispatch?: (action: Action) => void;
}

/** One pool: drag tokens out of it onto the map or another pool, or drop them back in. */
function Token({ player, slot, color, count, dispatch }: TokenProps) {
  const label = (
    <>
      <span className={`triangle ${count < 0 ? 'over' : ''}`} style={{ borderBottomColor: color }}>
        <b>{count}</b>
      </span>
      <small>{slot}</small>
    </>
  );
  if (!dispatch) {
    return (
      <div className="po-token" title={`${slot}: ${count}`}>
        {label}
      </div>
    );
  }
  return (
    <div
      className={`po-token ${count > 0 ? 'draggable' : ''}`}
      title={`${slot}: ${count}. Drag onto the map or another pool.`}
      draggable={count > 0}
      onDragStart={(e) => startTokenDrag(e, { player, from: slot })}
      // The board looks for these when a token is dragged off the map.
      data-token-slot={slot}
      data-player={player}
      onDragOver={acceptTokens}
      onDrop={(e) => {
        const drag = readTokenDrag(e);
        if (!drag || drag.from === 'speaker') return; // the section handles the speaker
        e.stopPropagation();
        // Moving tokens between your own pools; reinforcements adjust by themselves.
        if (drag.player !== player || drag.from === slot) return;
        if (drag.from !== 'reinforcements') dispatch({ type: 'seat/tokens', player, pool: drag.from, amount: -1 });
        if (slot !== 'reinforcements') dispatch({ type: 'seat/tokens', player, pool: slot, amount: 1 });
      }}
    >
      {label}
    </div>
  );
}

/** The speaker token. `player` is its holder, or "" while nobody has it. */
export function SpeakerBadge({ player, draggable = false }: { player: string; draggable?: boolean }) {
  return (
    <span
      className={`speaker-badge ${draggable ? 'draggable' : ''}`}
      title={draggable ? 'Speaker token: drag it onto the map' : 'Speaker'}
      draggable={draggable}
      onDragStart={draggable ? (e) => startTokenDrag(e, { player, from: 'speaker' }) : undefined}
    >
      SPEAKER
    </span>
  );
}

function startTokenDrag(e: DragEvent, drag: TokenDrag) {
  e.dataTransfer.setData(TOKEN_MIME, JSON.stringify(drag));
  e.dataTransfer.effectAllowed = 'move';
}

export function acceptTokens(e: DragEvent) {
  if (e.dataTransfer.types.includes(TOKEN_MIME)) e.preventDefault();
}

export function readTokenDrag(e: DragEvent): TokenDrag | undefined {
  const data = e.dataTransfer.getData(TOKEN_MIME);
  if (!data) return undefined;
  e.preventDefault();
  return JSON.parse(data) as TokenDrag;
}
