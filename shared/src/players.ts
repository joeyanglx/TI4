import { FACTIONS } from './cards';
import type { PlayerColor } from './pieces';

/** Per-player info everyone can see, keyed by player name. */
export interface Seat {
  color?: PlayerColor;
  /** Faction alias, e.g. "hacan" (see FACTIONS). Only shown as an icon and used for starting techs. */
  faction?: string;
  /** Victory points from anything other than objectives: custodians, agendas, relics, Imperial. */
  bonusVp: number;
  tradeGoods: number;
  commodities: number;
  /** Set by the faction sheet (2–6); there are no faction sheets here, so players set it. */
  commodityMax: number;
  /** Command tokens on the command sheet. Reinforcements are whatever's left of the 16. */
  tokens: Record<TokenPool, number>;
  /** Researched technology ids. */
  technologies: string[];
  exhaustedTechnologies: string[];
}

export type TokenPool = 'tactic' | 'fleet' | 'strategy';
export const TOKEN_POOLS: TokenPool[] = ['tactic', 'fleet', 'strategy'];
/** Each player has 16 command tokens in all. */
export const COMMAND_TOKENS = 16;

/** A planet card. Keyed by planet name, which is unique apart from alternate tiles of the same planet. */
export interface PlanetState {
  owner?: string;
  exhausted: boolean;
}

export type Commodity = 'tradeGoods' | 'commodities';

export type PlayerAction =
  | { type: 'seat/color'; player: string; color: PlayerColor }
  /** Pick a faction at game start: swaps the old faction's starting techs for the new one's. */
  | { type: 'seat/faction'; player: string; faction?: string }
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
  | { type: 'seat/tokens'; player: string; pool: TokenPool; amount: number }
  /** Status phase: ready every planet and technology a player has. */
  | { type: 'seat/readyAll'; player: string }
  | { type: 'tech/research'; player: string; tech: string }
  | { type: 'tech/remove'; player: string; tech: string }
  | { type: 'tech/exhaust'; player: string; tech: string; exhausted: boolean }
  /** Gain or lose control of a planet. A newly gained planet card comes in exhausted. */
  | { type: 'planet/control'; planet: string; player?: string }
  | { type: 'planet/exhaust'; planet: string; exhausted: boolean };

export interface PlayersState {
  seats: Record<string, Seat>;
  planets: Record<string, PlanetState>;
}

// Game setup: 3 tactic, 3 fleet and 2 strategy tokens.
const DEFAULT_SEAT: Seat = {
  bonusVp: 0,
  tradeGoods: 0,
  commodities: 0,
  commodityMax: 3,
  tokens: { tactic: 3, fleet: 3, strategy: 2 },
  technologies: [],
  exhaustedTechnologies: [],
};

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
    case 'seat/faction':
      return update(action.player, (s) => {
        const old = (s.faction && FACTIONS[s.faction]?.startingTech) || [];
        const starting = (action.faction && FACTIONS[action.faction]?.startingTech) || [];
        const kept = s.technologies.filter((t) => !old.includes(t));
        return {
          faction: action.faction,
          technologies: [...kept, ...starting.filter((t) => !kept.includes(t))],
          exhaustedTechnologies: s.exhaustedTechnologies.filter((t) => !old.includes(t)),
        };
      });
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
    case 'seat/tokens':
      return update(action.player, (s) => ({
        tokens: { ...s.tokens, [action.pool]: add(s.tokens[action.pool], action.amount) },
      }));
    case 'seat/readyAll': {
      const readied = update(action.player, () => ({ exhaustedTechnologies: [] }));
      return {
        ...readied,
        planets: Object.fromEntries(
          Object.entries(state.planets).map(([name, p]) => [name, p.owner === action.player ? { ...p, exhausted: false } : p]),
        ),
      };
    }
    case 'tech/research':
      return update(action.player, (s) =>
        s.technologies.includes(action.tech) ? {} : { technologies: [...s.technologies, action.tech] },
      );
    case 'tech/remove':
      return update(action.player, (s) => ({
        technologies: s.technologies.filter((t) => t !== action.tech),
        exhaustedTechnologies: s.exhaustedTechnologies.filter((t) => t !== action.tech),
      }));
    case 'tech/exhaust':
      return update(action.player, (s) => {
        const exhaustedTechnologies = s.exhaustedTechnologies.filter((t) => t !== action.tech);
        if (action.exhausted && s.technologies.includes(action.tech)) exhaustedTechnologies.push(action.tech);
        return { exhaustedTechnologies };
      });
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
  }
}
