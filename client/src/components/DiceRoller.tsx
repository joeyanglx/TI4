import { useState } from 'react';
import { FREE_DICE, rollTotal, type Action, type GameState } from '@ti4/shared';
import { rollDice } from '../dice';
import { newId } from '../id';

const MAX_DICE = 10;

/** Top-bar dice: roll some D4s, D6s or D10s for everyone to see, with your latest result next to the buttons. */
export function DiceRoller({ state, me, dispatch }: { state: GameState; me: string; dispatch: (action: Action) => void }) {
  const [count, setCount] = useState(1);
  const last = [...state.rolls].reverse().find((r) => r.kind === 'free' && r.player === me);

  function roll(sides: number) {
    const unit = `D${sides}`;
    const group = { unit, sides, hitsOn: 0, modifier: 0, results: rollDice(sides, count) };
    dispatch({ type: 'dice/roll', roll: { id: newId(), player: me, kind: 'free', groups: [group] } });
  }

  return (
    <span className="dice-roller">
      <select value={count} onChange={(e) => setCount(Number(e.target.value))} title="How many dice">
        {Array.from({ length: MAX_DICE }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}×
          </option>
        ))}
      </select>
      {FREE_DICE.map((sides) => (
        <button key={sides} onClick={() => roll(sides)} title={`Roll ${count} D${sides} for everyone to see`}>
          D{sides}
        </button>
      ))}
      {last && (
        <span className="dice-result" title="Your latest roll">
          {last.groups[0].unit}: <b>{last.groups.flatMap((g) => g.results).join(' ')}</b>
          {last.groups[0].results.length > 1 && <span className="muted"> = {rollTotal(last)}</span>}
        </span>
      )}
    </span>
  );
}
