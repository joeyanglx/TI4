import cardsJson from './data/cards.json';
import type { UnitKind } from './pieces';

// Card data comes from the AsyncTI4 bot (official cards only), see scripts/import-cards.mjs.
// Card ids are unique per physical copy, e.g. "sabo1".."sabo4". Agendas, relics and technologies are
// prefixed ("agenda_", "relic_", "tech_") because their AsyncTI4 aliases can clash with action cards.

export type CardExpansion = 'base' | 'pok' | 'te';
export type ObjectiveType = 'stage1' | 'stage2' | 'secret';

/** Which box(es) the game is played with, chosen at card setup. */
export type Edition = 'base' | 'pok' | 'te';
export const EDITION_NAMES: Record<Edition, string> = {
  base: 'Base game',
  pok: 'Prophecy of Kings',
  te: "Prophecy of Kings + Thunder's Edge",
};

/** Whether content from an expansion is in play: PoK needs PoK or PoK + TE, Thunder's Edge needs PoK + TE. */
export function inEdition(expansion: CardExpansion, edition: Edition): boolean {
  return expansion === 'base' || (expansion === 'pok' && edition !== 'base') || edition === 'te';
}

/** True once a game's cards have moved from a fresh setup, so switching edition would throw something away. */
export function cardsInUse(cards: CardsState): boolean {
  return (
    Object.values(cards.hands).some((hand) => hand.length > 0) ||
    Object.values(cards.relics).some((relics) => relics.length > 0) ||
    cards.discard.length > 0 ||
    cards.voting.length > 0 ||
    cards.laws.length > 0 ||
    cards.agendaDiscard.length > 0 ||
    cards.purged.length > 0 ||
    cards.revealed.length > 2 ||
    Object.values(cards.scored).some((players) => players.length > 0) ||
    cards.strategy.some((s) => s.holder || s.tradeGoods > 0)
  );
}

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

export interface AgendaInfo {
  name: string;
  expansion: CardExpansion;
  type: 'law' | 'directive';
  /** "For/Against", "Elect Player", "Elect Planet", ... sometimes with a reveal rule in brackets. */
  target: string;
  /** Outcome if "For" wins, or for the elected player/planet. */
  for: string;
  against?: string;
}

export interface RelicInfo {
  name: string;
  expansion: CardExpansion;
  text: string;
}

export type TechType = 'biotic' | 'cybernetic' | 'propulsion' | 'warfare' | 'unit' | 'none';

export interface TechnologyInfo {
  name: string;
  expansion: CardExpansion;
  type: TechType;
  /** One letter per prerequisite: G biotic, Y cybernetic, B propulsion, R warfare. */
  requirements: string;
  /** Faction name, for faction technologies. */
  faction?: string;
  /** Faction alias (see FACTIONS), for faction technologies. */
  factionId?: string;
  text: string;
}

export interface FactionInfo {
  name: string;
  expansion: CardExpansion;
  /** Technologies the faction starts with. */
  startingTech: string[];
  /** Factions that pick their starting techs instead; no options means any technology. */
  choose?: { count: number; options: string[] };
  commodities: number;
  abilities: { name: string; text: string }[];
  promissoryNotes: PromissoryNoteInfo[];
  /** One unit id per unit type, with the faction's own units in place of the generic ones (see UNITS). */
  units: string[];
  startingFleet?: StartingUnit[];
  /** Home system tile ids, most likely first (Keleres can take any of three). */
  homeSystems?: string[];
}

/** Units a faction starts with; `planet` is the start of a home planet's name, ground units and structures only. */
export interface StartingUnit {
  unit: UnitKind;
  count: number;
  planet?: string;
}

export interface PromissoryNoteInfo {
  id: string;
  name: string;
  /** Generic notes say "<color>" where the owning player goes; see promissoryText. */
  text: string;
  expansion: CardExpansion;
  /** Played face up into the holder's play area. */
  playArea?: boolean;
  /** Goes straight into the play area when received (Support for the Throne, Alliance). */
  playImmediately?: boolean;
}

export interface DiceRoll {
  hitsOn: number;
  dice: number;
}

export interface UnitInfo {
  name: string;
  /** Upgraded units' card title, e.g. "Advanced Fighters". */
  subtitle?: string;
  type: string;
  expansion: CardExpansion;
  /** 0.5 for fighters and infantry: 1 cost buys 2. */
  cost?: number;
  combat?: DiceRoll;
  move?: number;
  capacity?: number;
  sustainDamage?: boolean;
  bombardment?: DiceRoll;
  antiFighterBarrage?: DiceRoll;
  spaceCannon?: DiceRoll & { deepSpace?: boolean };
  planetaryShield?: boolean;
  production?: string;
  ability?: string;
  /** Unit id of the upgraded version. */
  upgrade?: string;
  /** For upgraded units: the technology that unlocks them. */
  requiredTech?: string;
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
export const AGENDAS = cardsJson.agendas as Record<string, AgendaInfo>;
export const RELICS = cardsJson.relics as Record<string, RelicInfo>;
export const STRATEGY_CARDS = cardsJson.strategyCards as Record<string, StrategyCardInfo>;
export const TECHNOLOGIES = cardsJson.technologies as Record<string, TechnologyInfo>;
/** Keyed by AsyncTI4 faction alias, e.g. "hacan". */
export const FACTIONS = cardsJson.factions as Record<string, FactionInfo>;
/** The notes every player has their own copy of: Ceasefire, Political Secret, Support for the Throne, ... */
export const GENERIC_PROMISSORY_NOTES = cardsJson.genericPromissoryNotes as PromissoryNoteInfo[];

const PROMISSORY_NOTES: Record<string, PromissoryNoteInfo> = Object.fromEntries(
  [...GENERIC_PROMISSORY_NOTES, ...Object.values(cardsJson.factions as Record<string, FactionInfo>).flatMap((f) => f.promissoryNotes)].map(
    (n) => [n.id, n],
  ),
);

export function promissoryNote(id: string): PromissoryNoteInfo | undefined {
  return PROMISSORY_NOTES[id];
}

/** A player's own promissory notes: the generic ones for the edition plus their faction's. */
export function promissoryNotesOf(edition: Edition, faction: string | undefined): PromissoryNoteInfo[] {
  const generic = GENERIC_PROMISSORY_NOTES.filter((n) => edition !== 'base' || n.expansion === 'base');
  return [...generic, ...((faction && FACTIONS[faction]?.promissoryNotes) || [])];
}

/** Note text with the owner's name in place of "<color>". */
export function promissoryText(note: PromissoryNoteInfo, owner: string): string {
  return note.text.replaceAll('<color>', owner);
}

/** Generic and faction units, keyed by AsyncTI4 unit id, e.g. "carrier", "sol_carrier2". */
export const UNITS = cardsJson.units as Record<string, UnitInfo>;

export type DeckId = 'action' | ObjectiveType | 'agenda' | 'relic';
export const DECK_IDS: DeckId[] = ['action', 'secret', 'stage1', 'stage2', 'agenda', 'relic'];

/** The cards in each edition's decks, straight from AsyncTI4's deck lists. */
const EDITION_DECKS = cardsJson.editions as Record<
  Edition,
  Record<DeckId | 'strategy' | 'technology' | 'faction', string[]>
>;

/** Technologies only the given faction can research. The Firmament flips into the Obsidian, so it gets both. */
export function factionTechnologies(edition: Edition, faction: string | undefined): string[] {
  if (!faction) return [];
  const factions = faction === 'firmament' ? ['firmament', 'obsidian'] : [faction];
  return editionTechnologies(edition).filter((id) => factions.includes(TECHNOLOGIES[id].factionId ?? ''));
}

/** Factions playable in an edition. */
export function editionFactions(edition: Edition): string[] {
  return EDITION_DECKS[edition].faction;
}

/** Technologies available in an edition: generic ones plus every faction's. */
export function editionTechnologies(edition: Edition): string[] {
  return EDITION_DECKS[edition].technology;
}

export interface StrategyCardState {
  id: string;
  /** Player name, or undefined while it's in the common pool. */
  holder?: string;
  exhausted: boolean;
  /** Trade goods that pile up on cards nobody picks. */
  tradeGoods: number;
}

export interface Law {
  id: string;
  /** The elected player or planet, for "Elect ..." laws. */
  elected?: string;
}

export interface CardsState {
  edition: Edition;
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
  /** Agendas revealed this agenda phase, waiting on the vote. */
  voting: string[];
  laws: Law[];
  /** Resolved directives and repealed laws, most recent last. */
  agendaDiscard: string[];
  /** Player name -> relics in their play area (face up). */
  relics: Record<string, string[]>;
  exhaustedRelics: string[];
  /** Removed from the game. */
  purged: string[];
}

export interface CardSetupOptions {
  /** Shuffle seed, so every client builds the same decks. */
  seed: number;
  edition: Edition;
}

export type CardAction =
  | { type: 'cards/setup'; options: CardSetupOptions }
  /**
   * Objective and agenda decks reveal face up, the relic deck goes to the player's play area,
   * and action and secret decks draw into the player's hand.
   */
  | { type: 'cards/draw'; deck: DeckId; player: string }
  /** Shuffle the action discard pile back into the action deck. */
  | { type: 'cards/reshuffle'; seed: number }
  /** Play or discard an action card; discard a resolved directive or repeal a law. */
  | { type: 'card/discard'; card: string }
  /** Move a card to a player: action cards and secrets into their hand, relics into their play area. */
  | { type: 'card/give'; card: string; player: string }
  /**
   * Put a card back into its own deck: shuffled in (a discarded secret, an objective revealed by mistake),
   * or on top or bottom (agendas, after the Politics card's look at the top two).
   */
  | { type: 'card/return'; card: string; seed: number; position?: 'top' | 'bottom' }
  | { type: 'card/score'; card: string; player: string; scored: boolean }
  | { type: 'card/purge'; card: string }
  | { type: 'relic/exhaust'; card: string; exhausted: boolean }
  /** A law passes: it stays in play. */
  | { type: 'agenda/enact'; card: string }
  | { type: 'agenda/elect'; card: string; elected?: string }
  | { type: 'strategy/pick'; id: string; player?: string }
  | { type: 'strategy/exhaust'; id: string; exhausted: boolean }
  | { type: 'strategy/tradeGoods'; id: string; amount: number }
  /** Take every trade good off every strategy card (they go back to the supply, not to anyone). */
  | { type: 'strategy/clearTradeGoods' }
  /** Status phase: every card goes back to the pool, readied. */
  | { type: 'strategy/returnAll' };

export function emptyCards(): CardsState {
  return {
    edition: 'te',
    decks: { action: [], secret: [], stage1: [], stage2: [], agenda: [], relic: [] },
    discard: [],
    revealed: [],
    scored: {},
    hands: {},
    strategy: [],
    voting: [],
    laws: [],
    agendaDiscard: [],
    relics: {},
    exhaustedRelics: [],
    purged: [],
  };
}

/** Fresh, shuffled decks with the first two stage I objectives revealed, as in game setup. */
export function setupCards({ seed, edition }: CardSetupOptions): CardsState {
  const random = seededRandom(seed);
  const editionDecks = EDITION_DECKS[edition];
  const decks = Object.fromEntries(DECK_IDS.map((d) => [d, shuffle(editionDecks[d], random)])) as Record<
    DeckId,
    string[]
  >;
  const revealed = decks.stage1.splice(-2).reverse();
  const strategy = editionDecks.strategy.map((id) => ({ id, exhausted: false, tradeGoods: 0 }));
  return { ...emptyCards(), edition, decks, revealed, strategy };
}

export function isActionCard(id: string) {
  return id in ACTION_CARDS;
}

export function deckOf(id: string): DeckId | undefined {
  if (id in ACTION_CARDS) return 'action';
  if (id in AGENDAS) return 'agenda';
  if (id in RELICS) return 'relic';
  return OBJECTIVES[id]?.type;
}

export function cardName(id: string) {
  return ACTION_CARDS[id]?.name ?? OBJECTIVES[id]?.name ?? AGENDAS[id]?.name ?? RELICS[id]?.name ?? id;
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
      switch (action.deck) {
        case 'stage1':
        case 'stage2':
          return { ...next, revealed: [...next.revealed, card] };
        case 'agenda':
          return { ...next, voting: [...next.voting, card] };
        case 'relic':
          return addTo(next, 'relics', action.player, card);
        default:
          return addTo(next, 'hands', action.player, card);
      }
    }
    case 'cards/reshuffle': {
      const pile = shuffle([...cards.decks.action, ...cards.discard], seededRandom(action.seed));
      return { ...cards, decks: { ...cards.decks, action: pile }, discard: [] };
    }
    case 'card/discard': {
      const deck = deckOf(action.card);
      if (deck === 'action') {
        const next = removeCard(cards, action.card);
        return { ...next, discard: [...next.discard, action.card] };
      }
      if (deck === 'agenda') {
        const next = removeCard(cards, action.card);
        return { ...next, agendaDiscard: [...next.agendaDiscard, action.card] };
      }
      return cards;
    }
    case 'card/give': {
      const deck = deckOf(action.card);
      if (deck === 'relic') return addTo(removeCard(cards, action.card), 'relics', action.player, action.card);
      if (deck === 'action' || deck === 'secret') {
        return addTo(removeCard(cards, action.card), 'hands', action.player, action.card);
      }
      return cards;
    }
    case 'card/return': {
      const deckId = deckOf(action.card);
      if (!deckId) return cards;
      const next = removeCard(cards, action.card);
      const deck = [...next.decks[deckId]];
      const index =
        action.position === 'top'
          ? deck.length
          : action.position === 'bottom'
            ? 0
            : Math.floor(seededRandom(action.seed)() * (deck.length + 1));
      deck.splice(index, 0, action.card);
      return { ...next, decks: { ...next.decks, [deckId]: deck } };
    }
    case 'card/score': {
      const info = OBJECTIVES[action.card];
      if (!info) return cards;
      if (info.type === 'secret') {
        // A scored secret is shown to everyone and leaves its owner's hand; unscoring puts it back.
        const next = removeCard(cards, action.card);
        if (!action.scored) return addTo(next, 'hands', action.player, action.card);
        return { ...next, scored: { ...next.scored, [action.card]: [action.player] } };
      }
      const scorers = (cards.scored[action.card] ?? []).filter((p) => p !== action.player);
      if (action.scored) scorers.push(action.player);
      return { ...cards, scored: { ...cards.scored, [action.card]: scorers } };
    }
    case 'card/purge': {
      const next = removeCard(cards, action.card);
      return { ...next, purged: [...next.purged, action.card] };
    }
    case 'relic/exhaust': {
      const exhaustedRelics = cards.exhaustedRelics.filter((c) => c !== action.card);
      if (action.exhausted) exhaustedRelics.push(action.card);
      return { ...cards, exhaustedRelics };
    }
    case 'agenda/enact': {
      if (AGENDAS[action.card]?.type !== 'law') return cards;
      const next = removeCard(cards, action.card);
      return { ...next, laws: [...next.laws, { id: action.card }] };
    }
    case 'agenda/elect':
      return {
        ...cards,
        laws: cards.laws.map((law) => (law.id === action.card ? { ...law, elected: action.elected } : law)),
      };
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
    case 'strategy/clearTradeGoods':
      return { ...cards, strategy: cards.strategy.map((s) => ({ ...s, tradeGoods: 0 })) };
    case 'strategy/returnAll':
      return { ...cards, strategy: cards.strategy.map((s) => ({ ...s, holder: undefined, exhausted: false })) };
  }
}

function addTo(cards: CardsState, area: 'hands' | 'relics', player: string, card: string): CardsState {
  return { ...cards, [area]: { ...cards[area], [player]: [...(cards[area][player] ?? []), card] } };
}

/** Take a card out of whichever pile, hand or play area it's in. */
function removeCard(cards: CardsState, card: string): CardsState {
  const without = (list: string[]) => list.filter((c) => c !== card);
  const fromEach = (byPlayer: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(byPlayer).map(([p, list]) => [p, without(list)]));
  const scored = { ...cards.scored };
  if (OBJECTIVES[card]?.type === 'secret') delete scored[card];
  return {
    ...cards,
    decks: Object.fromEntries(DECK_IDS.map((d) => [d, without(cards.decks[d])])) as Record<DeckId, string[]>,
    discard: without(cards.discard),
    revealed: without(cards.revealed),
    scored,
    hands: fromEach(cards.hands),
    voting: without(cards.voting),
    laws: cards.laws.filter((law) => law.id !== card),
    agendaDiscard: without(cards.agendaDiscard),
    relics: fromEach(cards.relics),
    exhaustedRelics: without(cards.exhaustedRelics),
    purged: without(cards.purged),
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
