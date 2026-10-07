import { useEffect, useRef, useState } from 'react';
import { ROLL_KINDS, rollHits, type GameState, type Roll } from '@ti4/shared';

const SHOW_MS = 6000;

/** Pops up other players' dice rolls over the board for a few seconds. */
export function RollToast({ state, me, online }: { state: GameState; me: string; online: boolean }) {
  const latest = state.rolls.at(-1);
  // Rolls already in the room when you join aren't news; start watching once the room has loaded.
  const seen = useRef<string | undefined | null>(null);
  const [shown, setShown] = useState<Roll | null>(null);

  useEffect(() => {
    if (!online) return;
    if (seen.current === null) {
      seen.current = latest?.id;
      return;
    }
    if (!latest || latest.id === seen.current) return;
    seen.current = latest.id;
    if (latest.player === me) return;
    setShown(latest);
    const timer = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [latest, me, online]);

  if (!shown) return null;
  const hits = rollHits(shown);
  const dice = shown.groups.reduce((n, g) => n + g.results.length, 0);
  return (
    <div className="roll-toast" onClick={() => setShown(null)}>
      <b>{shown.player}</b> rolled {ROLL_KINDS.find((k) => k.kind === shown.kind)?.label.toLowerCase()}
      {shown.rerollOf ? ' (re-roll)' : ''}: <b className="roll-hits">{hits} {hits === 1 ? 'hit' : 'hits'}</b> from {dice}{' '}
      {dice === 1 ? 'die' : 'dice'}
    </div>
  );
}
