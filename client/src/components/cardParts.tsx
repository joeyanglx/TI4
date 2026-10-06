import type { ReactNode } from 'react';
import { PLAYER_COLORS, type GameState } from '@ti4/shared';

// Small pieces shared by the card panel sections.

export function CardDetails({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
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

/** Pick a player to hand a card to; `exclude` is whoever holds it now. */
export function GiveSelect({
  players,
  exclude,
  onGive,
  label = 'Give…',
}: {
  players: string[];
  exclude: string;
  onGive: (player: string) => void;
  label?: string;
}) {
  const others = players.filter((p) => p !== exclude);
  if (!others.length) return null;
  return (
    <select value="" onChange={(e) => e.target.value && onGive(e.target.value)} title="Give to another player">
      <option value="">{label}</option>
      {others.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

export function PlayerTag({ player, state }: { player: string; state: GameState }) {
  const color = state.seats[player]?.color;
  return (
    <span className="player-tag">
      <span className="player-dot" style={{ background: color ? PLAYER_COLORS[color] : 'var(--muted)' }} />
      {player}
    </span>
  );
}
