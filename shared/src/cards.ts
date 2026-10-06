import cardsJson from './data/cards.json';

// Card data comes from the AsyncTI4 bot (official cards only), see scripts/import-cards.mjs.
// Card ids are unique per physical copy, e.g. "sabo1".."sabo4".

export type CardExpansion = 'base' | 'pok' | 'te';
export type ObjectiveType = 'stage1' | 'stage2' | 'secret';

export interface ActionCardInfo {
  name: string;
  expansion: CardExpansion;
  phase: string;
  window: string;
  text: string;
}

export interface ObjectiveInfo {
  name: string;
  type: ObjectiveType;
  expansion: CardExpansion;
  phase: string;
  points: number;
  text: string;
}

export interface StrategyCardInfo {
  name: string;
  initiative: number;
  expansion: CardExpansion;
  color: string;
  primary: string[];
  secondary: string[];
}

export const ACTION_CARDS = cardsJson.actionCards as Record<string, ActionCardInfo>;
export const OBJECTIVES = cardsJson.objectives as Record<string, ObjectiveInfo>;
export const STRATEGY_CARDS = cardsJson.strategyCards as Record<string, StrategyCardInfo>;

export type DeckId = 'action' | ObjectiveType;
export const DECK_IDS: DeckId[] = ['action', 'secret', 'stage1', 'stage2'];

export interface StrategyCardState {
  id: string;
  /** Player name, or undefined while it's in the common pool. */
  holder?: string;
  exhausted: boolean;
  /** Trade goods that pile up on cards nobody picks. */
  tradeGoods: number;
}

export interface CardsState {
  /** Draw piles, top card last. */
  decks: Record<DeckId, string[]>;
  /** Action card discard pile, most recent last. */
  discard: string[];
  /** Face-up public objectives, in reveal order. */
  revealed: string[];
  /** Objective id -> players who scored it. A scored secret leaves its owner's hand. */
  scored: Record<string, string[]>;
  /**
   * Player name -> action cards and unscored secret objectives.
   * Everyone receives this; the UI only shows you your own hand.
   */
  hands: Record<string, string[]>;
  /** In initiative order. */
  strategy: StrategyCardState[];
}

export interface CardSetupOptions {
  /** Shuffle seed, so every client builds the same decks. */
  seed: number;
  thundersEdge: boolean;
}

export type CardAction =
  | { type: 'cards/setup'; options: CardSetupOptions }
  /** Objective decks reveal face up; action and secret decks draw into the player's hand. */
  | { type: 'cards/draw'; deck: DeckId; player: string }
  /** Shuffle the action discard pile back into the action deck. */
  | { type: 'cards/reshuffle'; seed: number }
  /** Play or discard an action card. */
  | { type: 'card/discard'; card: string }
  /** Move a card into a player's hand, e.g. a transaction or taking one back from the discard pile. */
  | { type: 'card/give'; card: string; player: string }
  /** Shuffle a card back into its own deck (a discarded secret, or an objective revealed by mistake). */
  | { type: 'card/return'; card: string; seed: number }
  | { type: 'card/score'; card: string; player: string; scored: boolean }
  | { type: 'strategy/pick'; id: string; player?: string }
  | { type: 'strategy/exhaust'; id: string; exhausted: boolean }
  | { type: 'strategy/tradeGoods'; id: string; amount: number }
  /** Status phase: every card goes back to the pool, readied. */
  | { type: 'strategy/returnAll' };

export function emptyCards(): CardsState {
  return {
    decks: { action: [], secret: [], stage1: [], stage2: [] },
    discard: [],
    revealed: [],
    scored: {},
    hands: {},
    strategy: [],
  };
}

/** Fresh, shuffled decks with the first two stage I objectives revealed, as in game setup. */
export function setupCards({ seed, thundersEdge }: CardSetupOptions): CardsState {
  const random = seededRandom(seed);
  const actions = Object.keys(ACTION_CARDS).filter((id) => thundersEdge || ACTION_CARDS[id].expansion !== 'te');
  const objectives = (type: ObjectiveType) => Object.keys(OBJECTIVES).filter((id) => OBJECTIVES[id].type === type);
  const decks: Record<DeckId, string[]> = {
    action: shuffle(actions, random),
    secret: shuffle(objectives('secret'), random),
    stage1: shuffle(objectives('stage1'), random),
    stage2: shuffle(objectives('stage2'), random),
  };
  const revealed = decks.stage1.splice(-2).reverse();

  // Thunder's Edge replaces Construction and Warfare.
  const byInitiative = new Map<number, string>();
  for (const [id, info] of Object.entries(STRATEGY_CARDS)) {
    if (info.expansion === 'te' && !thundersEdge) continue;
    if (info.expansion === 'te' || !byInitiative.has(info.initiative)) byInitiative.set(info.initiative, id);
  }
  const strategy = [...byInitiative.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, id]) => ({ id, exhausted: false, tradeGoods: 0 }));

  return { ...emptyCards(), decks, revealed, strategy };
}

export function isActionCard(id: string) {
  return id in ACTION_CARDS;
}

export function cardName(id: string) {
  return ACTION_CARDS[id]?.name ?? OBJECTIVES[id]?.name ?? id;
}

export function applyCardAction(cards: CardsState, action: CardAction): CardsState {
  switch (action.type) {
    case 'cards/setup':
      return setupCards(action.options);
    case 'cards/draw': {
      const deck = cards.decks[action.deck];
      const card = deck.at(-1);
      if (!card) return cards;
      const next = { ...cards, decks: { ...cards.decks, [action.deck]: deck.slice(0, -1) } };
      if (action.deck === 'stage1' || action.deck === 'stage2') return { ...next, revealed: [...next.revealed, card] };
      return addToHand(next, action.player, card);
    }
    case 'cards/reshuffle': {
      const pile = shuffle([...cards.decks.action, ...cards.discard], seededRandom(action.seed));
      return { ...cards, decks: { ...cards.decks, action: pile }, discard: [] };
    }
    case 'card/discard': {
      if (!isActionCard(action.card)) return cards;
      const next = removeCard(cards, action.card);
      return { ...next, discard: [...next.discard, action.card] };
    }
    case 'card/give':
      return addToHand(removeCard(cards, action.card), action.player, action.card);
    case 'card/return': {
      const deckId = isActionCard(action.card) ? 'action' : OBJECTIVES[action.card]?.type;
      if (!deckId) return cards;
      const next = removeCard(cards, action.card);
      const deck = [...next.decks[deckId]];
      deck.splice(Math.floor(seededRandom(action.seed)() * (deck.length + 1)), 0, action.card);
      return { ...next, decks: { ...next.decks, [deckId]: deck } };
    }
    case 'card/score': {
      const info = OBJECTIVES[action.card];
      if (!info) return cards;
      if (info.type === 'secret') {
        // A scored secret is shown to everyone and leaves its owner's hand; unscoring puts it back.
        const next = removeCard(cards, action.card);
        if (!action.scored) return addToHand(next, action.player, action.card);
        return { ...next, scored: { ...next.scored, [action.card]: [action.player] } };
      }
      const scorers = (cards.scored[action.card] ?? []).filter((p) => p !== action.player);
      if (action.scored) scorers.push(action.player);
      return { ...cards, scored: { ...cards.scored, [action.card]: scorers } };
    }
    case 'strategy/pick':
      // Whoever picks a card also takes the trade goods on it.
      return updateStrategy(cards, action.id, (s) => ({
        ...s,
        holder: action.player,
        tradeGoods: action.player ? 0 : s.tradeGoods,
      }));
    case 'strategy/exhaust':
      return updateStrategy(cards, action.id, (s) => ({ ...s, exhausted: action.exhausted }));
    case 'strategy/tradeGoods':
      return updateStrategy(cards, action.id, (s) => ({ ...s, tradeGoods: Math.max(0, s.tradeGoods + action.amount) }));
    case 'strategy/returnAll':
      return { ...cards, strategy: cards.strategy.map((s) => ({ ...s, holder: undefined, exhausted: false })) };
  }
}

function addToHand(cards: CardsState, player: string, card: string): CardsState {
  return { ...cards, hands: { ...cards.hands, [player]: [...(cards.hands[player] ?? []), card] } };
}

/** Take a card out of whichever pile, hand or objective row it's in. */
function removeCard(cards: CardsState, card: string): CardsState {
  const without = (list: string[]) => list.filter((c) => c !== card);
  const scored = { ...cards.scored };
  if (OBJECTIVES[card]?.type === 'secret') delete scored[card];
  return {
    ...cards,
    decks: Object.fromEntries(DECK_IDS.map((d) => [d, without(cards.decks[d])])) as Record<DeckId, string[]>,
    discard: without(cards.discard),
    revealed: without(cards.revealed),
    scored,
    hands: Object.fromEntries(Object.entries(cards.hands).map(([p, hand]) => [p, without(hand)])),
  };
}

function updateStrategy(
  cards: CardsState,
  id: string,
  update: (s: StrategyCardState) => StrategyCardState,
): CardsState {
  return { ...cards, strategy: cards.strategy.map((s) => (s.id === id ? update(s) : s)) };
}

/** Small deterministic PRNG (mulberry32): the same seed shuffles the same way on every client. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}
