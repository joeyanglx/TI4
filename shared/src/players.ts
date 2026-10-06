import type { PlayerColor } from './pieces';

/** Per-player info everyone can see, keyed by player name. */
export interface Seat {
  color?: PlayerColor;
  /** Victory points from anything other than objectives: custodians, agendas, relics, Imperial. */
  bonusVp: number;
  tradeGoods: number;
  commodities: number;
  /** Set by the faction sheet (2–6); there are no faction sheets here, so players set it. */
  commodityMax: number;
}

/** A planet card. Keyed by planet name, which is unique apart from alternate tiles of the same planet. */
export interface PlanetState {
  owner?: string;
  exhausted: boolean;
}

export type Commodity = 'tradeGoods' | 'commodities';

export type PlayerAction =
  | { type: 'seat/color'; player: string; color: PlayerColor }
  | { type: 'seat/bonusVp'; player: string; amount: number }
  | { type: 'seat/tradeGoods'; player: string; amount: number }
  | { type: 'seat/commodities'; player: string; amount: number }
  | { type: 'seat/commodityMax'; player: string; value: number }
  /** Refill commodities to the maximum, e.g. from the Trade strategy card. */
  | { type: 'seat/replenish'; player: string }
  /** Turn your own commodities into trade goods (some faction abilities and technologies). */
  | { type: 'seat/convert'; player: string; amount: number }
  /** A transaction. Commodities given to another player arrive as trade goods. */
  | { type: 'seat/give'; from: string; to: string; kind: Commodity; amount: number }
  /** Gain or lose control of a planet. A newly gained planet card comes in exhausted. */
  | { type: 'planet/control'; planet: string; player?: string }
  | { type: 'planet/exhaust'; planet: string; exhausted: boolean }
  /** Status phase: ready every planet a player controls. */
  | { type: 'planet/readyAll'; player: string };

export interface PlayersState {
  seats: Record<string, Seat>;
  planets: Record<string, PlanetState>;
}

const DEFAULT_SEAT: Seat = { bonusVp: 0, tradeGoods: 0, commodities: 0, commodityMax: 3 };

/** A player's seat, with defaults for players who haven't done anything yet (or joined before a field existed). */
export function seatOf(seats: Record<string, Seat>, player: string): Seat {
  return { ...DEFAULT_SEAT, ...seats[player] };
}

export function applyPlayerAction<S extends PlayersState>(state: S, action: PlayerAction): S {
  const update = (player: string, change: (seat: Seat) => Partial<Seat>): S => {
    const seat = seatOf(state.seats, player);
    return { ...state, seats: { ...state.seats, [player]: { ...seat, ...change(seat) } } };
  };
  const add = (value: number, amount: number) => Math.max(0, value + amount);

  switch (action.type) {
    case 'seat/color':
      return update(action.player, () => ({ color: action.color }));
    case 'seat/bonusVp':
      return update(action.player, (s) => ({ bonusVp: add(s.bonusVp, action.amount) }));
    case 'seat/tradeGoods':
      return update(action.player, (s) => ({ tradeGoods: add(s.tradeGoods, action.amount) }));
    case 'seat/commodities':
      return update(action.player, (s) => ({
        commodities: Math.min(s.commodityMax, add(s.commodities, action.amount)),
      }));
    case 'seat/commodityMax':
      return update(action.player, (s) => {
        const commodityMax = Math.max(0, Math.round(action.value));
        return { commodityMax, commodities: Math.min(s.commodities, commodityMax) };
      });
    case 'seat/replenish':
      return update(action.player, (s) => ({ commodities: s.commodityMax }));
    case 'seat/convert':
      return update(action.player, (s) => {
        const amount = Math.min(s.commodities, Math.max(0, action.amount));
        return { commodities: s.commodities - amount, tradeGoods: s.tradeGoods + amount };
      });
    case 'seat/give': {
      if (action.from === action.to) return state;
      const amount = Math.min(seatOf(state.seats, action.from)[action.kind], Math.max(0, action.amount));
      if (!amount) return state;
      const given = applyPlayerAction(state, { type: `seat/${action.kind}`, player: action.from, amount: -amount });
      return applyPlayerAction(given, { type: 'seat/tradeGoods', player: action.to, amount });
    }
    case 'planet/control': {
      const current = state.planets[action.planet];
      const planets = { ...state.planets };
      if (!action.player) delete planets[action.planet];
      else if (current?.owner !== action.player) planets[action.planet] = { owner: action.player, exhausted: true };
      return { ...state, planets };
    }
    case 'planet/exhaust': {
      const planet = state.planets[action.planet];
      if (!planet) return state;
      return { ...state, planets: { ...state.planets, [action.planet]: { ...planet, exhausted: action.exhausted } } };
    }
    case 'planet/readyAll':
      return {
        ...state,
        planets: Object.fromEntries(
          Object.entries(state.planets).map(([name, p]) => [name, p.owner === action.player ? { ...p, exhausted: false } : p]),
        ),
      };
  }
}
