import { useState } from 'react';
import { EDITION_NAMES, cardsInUse, randomSeed, type Action, type Edition, type GameState } from '@ti4/shared';

const LABELS: Record<Edition, string> = { base: 'Base', pok: 'PoK', te: 'PoK + TE' };

interface Props {
  state: GameState;
  dispatch: (action: Action) => void;
}

/**
 * The game's version, for everyone at the table. It picks which cards are in the decks and which relics,
 * factions, technologies, systems and units are offered. Switching rebuilds the card decks.
 */
export function EditionToggle({ state, dispatch }: Props) {
  const edition = state.cards.edition;
  const [pending, setPending] = useState<Edition | null>(null);
  const switchTo = (next: Edition) => {
    dispatch({ type: 'cards/setup', options: { seed: randomSeed(), edition: next } });
    setPending(null);
  };

  if (pending) {
    return (
      <div className="edition-confirm">
        <span>Switch to {EDITION_NAMES[pending]}? This reshuffles every deck and empties all hands.</span>
        <button className="danger" onClick={() => switchTo(pending)}>
          Switch
        </button>
        <button onClick={() => setPending(null)}>Cancel</button>
      </div>
    );
  }
  return (
    <div className="mode-toggle" title="Game version: which expansions are in play">
      {(Object.keys(LABELS) as Edition[]).map((e) => (
        <button
          key={e}
          className={e === edition ? 'selected' : ''}
          title={EDITION_NAMES[e]}
          onClick={() => e !== edition && (cardsInUse(state.cards) ? setPending(e) : switchTo(e))}
        >
          {LABELS[e]}
        </button>
      ))}
    </div>
  );
}
