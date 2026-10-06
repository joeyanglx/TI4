import { seatOf, type Action, type GameState } from '@ti4/shared';
import { GiveSelect } from './cardParts';

interface Props {
  state: GameState;
  players: string[];
  me: string;
  dispatch: (action: Action) => void;
}

export function EconomySection({ state, players, me, dispatch }: Props) {
  const seat = seatOf(state.seats, me);
  return (
    <section>
      <h2>Trade goods &amp; commodities</h2>
      <div className="counter-row">
        <span>Trade goods</span>
        <span className="counter">
          <button onClick={() => dispatch({ type: 'seat/tradeGoods', player: me, amount: -1 })}>−</button>
          <b>{seat.tradeGoods}</b>
          <button onClick={() => dispatch({ type: 'seat/tradeGoods', player: me, amount: 1 })}>+</button>
        </span>
        <GiveSelect
          players={players}
          exclude={me}
          label="Give 1…"
          onGive={(p) => dispatch({ type: 'seat/give', from: me, to: p, kind: 'tradeGoods', amount: 1 })}
        />
      </div>
      <div className="counter-row">
        <span>Commodities</span>
        <span className="counter">
          <button onClick={() => dispatch({ type: 'seat/commodities', player: me, amount: -1 })}>−</button>
          <b>
            {seat.commodities}/
            <input
              type="number"
              min={0}
              max={9}
              title="Commodity limit from your faction sheet"
              value={seat.commodityMax}
              onChange={(e) =>
                e.target.value !== '' &&
                dispatch({ type: 'seat/commodityMax', player: me, value: Number(e.target.value) })
              }
            />
          </b>
          <button onClick={() => dispatch({ type: 'seat/commodities', player: me, amount: 1 })}>+</button>
        </span>
        <GiveSelect
          players={players}
          exclude={me}
          label="Give 1…"
          onGive={(p) => dispatch({ type: 'seat/give', from: me, to: p, kind: 'commodities', amount: 1 })}
        />
      </div>
      <div className="row">
        <button
          disabled={seat.commodities >= seat.commodityMax}
          onClick={() => dispatch({ type: 'seat/replenish', player: me })}
        >
          Replenish
        </button>
        <button
          disabled={!seat.commodities}
          title="Turn 1 of your own commodities into a trade good"
          onClick={() => dispatch({ type: 'seat/convert', player: me, amount: 1 })}
        >
          Convert 1 to TG
        </button>
      </div>
      <p className="hint">Commodities you give to another player become trade goods for them.</p>
    </section>
  );
}
