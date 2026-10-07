import {
  ACTION_CARDS,
  AGENDAS,
  FACTIONS,
  OBJECTIVES,
  RELICS,
  STRATEGY_CARDS,
  TECHNOLOGIES,
  cardName,
  promissoryNote,
} from './cards';
import { fightsIn, hitsToAssign, sideHits } from './battle';
import { ROLL_KINDS, describeFreeRoll, rollHits } from './dice';
import { hexKey, hexToPixel, pixelToHex } from './hex';
import { planetAt } from './planets';
import { applyAction, stackSize, type Action, type GameState, type Piece } from './state';
import { SYSTEMS } from './systems';

/** One step in a room's history, as the server keeps it. */
export interface HistoryRecord {
  seq: number;
  player: string;
  /** Milliseconds since the epoch. */
  at: number;
  /** Plain-English description, written when it happened; never reveals hidden cards. */
  text: string;
  action?: Action;
  /** Set on a rewind: the table went back to how it was just after this entry (0 = start of history). */
  rewindTo?: number;
}

/** What clients get: the record without the raw action. */
export type HistoryEntry = Omit<HistoryRecord, 'action'> & {
  /** Consecutive entries with the same group are collapsed in the log (piece and tile moves). */
  group?: string;
};

export function toEntry(record: HistoryRecord): HistoryEntry {
  const { action, ...entry } = record;
  const move = action?.type === 'piece/move' || action?.type === 'tile/move';
  return move ? { ...entry, group: `move:${record.player}` } : entry;
}

/**
 * The table as it was just after entry `seq`, replayed from the history's starting state. Every action
 * is deterministic (shuffle seeds, dice and new ids travel inside the action), so this is exact.
 */
export function stateAt(base: GameState, records: HistoryRecord[], seq: number): GameState {
  let state = base;
  for (const record of records) {
    if (record.seq > seq) break;
    if (record.rewindTo !== undefined) state = stateAt(base, records, record.rewindTo);
    else if (record.action) state = applyAction(state, record.action);
  }
  return state;
}

const PIECE_NAMES: Partial<Record<Piece['kind'], string>> = {
  warsun: 'war sun',
  pds: 'PDS',
  spacedock: 'space dock',
  command: 'command token',
  control: 'control token',
  speaker: 'speaker token',
  custodians: 'custodians token',
};

function pieceName(piece: Pick<Piece, 'kind' | 'count'>): string {
  const name = PIECE_NAMES[piece.kind] ?? piece.kind;
  const count = stackSize(piece as Piece);
  return count > 1 ? `${count} × ${name}` : `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

/** "Mecatol Rex (18)", "system 41" or "empty space" for a board position. */
function placeName(state: GameState, x: number, y: number): string {
  const tile = state.tiles[hexKey(pixelToHex({ x, y }))];
  if (!tile) return 'empty space';
  const planets = SYSTEMS[tile.system]?.planets.map((p) => p.name) ?? [];
  return planets.length ? `${planets.join(' / ')} (${tile.system})` : `system ${tile.system}`;
}

/** Where a piece is, for moves: "Abyz (38)" on a planet, else the system. Ships are always in space. */
function pieceWhere(state: GameState, kind: Piece['kind'], x: number, y: number): { label: string; planet?: string; number?: string } {
  const tile = state.tiles[hexKey(pixelToHex({ x, y }))];
  const planet = fightsIn(kind, 'space') ? undefined : planetAt(state, { x, y })?.planet.name;
  return { label: planet && tile ? `${planet} (${tile.system})` : placeName(state, x, y), planet, number: tile?.system };
}

/** "from Jord (4) to Mecatol Rex (18)", "from space to Jord (4)", "within Mecatol Rex (18)". */
function moveText(state: GameState, piece: Piece, x: number, y: number): string {
  const from = pieceWhere(state, piece.kind, piece.x, piece.y);
  const to = pieceWhere(state, piece.kind, x, y);
  if (hexKey(pixelToHex(piece)) !== hexKey(pixelToHex({ x, y }))) return `from ${from.label} to ${to.label}`;
  if (from.planet === to.planet) return `within ${placeName(state, x, y)}`;
  if (!from.planet) return `from space to ${to.label}`;
  if (!to.planet) return `from ${from.label} to space`;
  return `from ${from.planet} to ${to.label}`;
}

/** Centre of a system in board pixels, for placeName. */
function pointOf(state: GameState, system: string): [number, number] {
  const tile = state.tiles[system];
  const { x, y } = hexToPixel(tile ?? { q: 0, r: 0 });
  return [x, y];
}

const DECK_NAMES = { action: 'an action card', secret: 'a secret objective' } as const;

/**
 * Describe an action from the state just before it. Anything another player shouldn't learn (which
 * action card or secret objective someone drew, the agendas Politics looked at) stays vague.
 */
export function describeAction(state: GameState, action: Action): string {
  const piece = 'id' in action && typeof action.id === 'string' ? state.pieces[action.id] : undefined;
  switch (action.type) {
    case 'piece/add':
      return `placed ${pieceName(action.piece)} in ${placeName(state, action.piece.x, action.piece.y)}`;
    case 'piece/move':
      return piece ? `moved ${pieceName(piece)} ${moveText(state, piece, action.x, action.y)}` : 'moved a piece';
    case 'piece/remove':
      return piece ? `removed ${pieceName(piece)}` : 'removed a piece';
    case 'piece/count':
      return piece
        ? `${action.amount > 0 ? 'added' : 'removed'} ${Math.abs(action.amount)} ${action.amount > 0 ? 'to' : 'from'} a ${PIECE_NAMES[piece.kind] ?? piece.kind} stack`
        : 'changed a stack';
    case 'piece/damage':
      return piece
        ? `${action.amount > 0 ? 'damaged' : 'repaired'} a ${PIECE_NAMES[piece.kind] ?? piece.kind}`
        : 'marked damage';
    case 'piece/merge': {
      const from = state.pieces[action.from];
      const into = state.pieces[action.into];
      if (!from || !into) return 'merged stacks';
      return `moved ${pieceName(from)} ${moveText(state, from, into.x, into.y)}, stacking with ${stackSize(into)} more`;
    }
    case 'piece/split':
      return piece ? `split a ${PIECE_NAMES[piece.kind] ?? piece.kind} off a stack` : 'split a stack';
    case 'tile/place':
      return `placed system ${action.tile.system}`;
    case 'tile/remove':
      return `removed system ${state.tiles[action.id]?.system ?? ''}`.trim();
    case 'tile/rotate':
      return `rotated system ${state.tiles[action.id]?.system ?? ''}`.trim();
    case 'tile/move':
      return `moved system ${state.tiles[hexKey(action.from)]?.system ?? ''}`.trim();
    case 'map/set':
      return `loaded a map (${Object.keys(action.tiles).length} systems)${action.custodians && !Object.values(state.pieces).some((p) => p.kind === 'custodians') ? ' with the custodians token on Mecatol Rex' : ''}`;
    case 'game/reset':
      return 'reset the game';
    case 'cards/setup':
      return `set up the cards for ${action.options.edition === 'base' ? 'the base game' : action.options.edition === 'pok' ? 'Prophecy of Kings' : "PoK + Thunder's Edge"}`;
    case 'cards/draw': {
      const top = state.cards.decks[action.deck].at(-1);
      if (!top) return 'tried to draw from an empty deck';
      if (action.deck === 'action' || action.deck === 'secret') return `drew ${DECK_NAMES[action.deck]}`;
      if (action.deck === 'agenda') return `revealed the agenda ${AGENDAS[top].name}`;
      if (action.deck === 'relic') return `gained the relic ${RELICS[top].name}`;
      return `revealed the objective ${OBJECTIVES[top].name}`;
    }
    case 'cards/reshuffle':
      return 'shuffled the action card discard pile into the deck';
    case 'card/discard':
      return ACTION_CARDS[action.card]
        ? `played ${ACTION_CARDS[action.card].name}`
        : `discarded the agenda ${cardName(action.card)}`;
    case 'card/give': {
      if (RELICS[action.card]) return `gave the relic ${RELICS[action.card].name} to ${action.player}`;
      if (state.cards.discard.includes(action.card)) return `took ${cardName(action.card)} from the discard pile`;
      const kind = ACTION_CARDS[action.card] ? 'an action card' : 'a secret objective';
      return `gave ${kind} to ${action.player}`;
    }
    case 'card/return':
      if (AGENDAS[action.card]) {
        // Politics: which agendas went where is the holder's secret, unless the agenda was face up.
        const known = state.cards.voting.includes(action.card) || state.cards.agendaDiscard.includes(action.card);
        const name = known ? `the agenda ${AGENDAS[action.card].name}` : 'an agenda';
        return `put ${name} ${action.position ? `on the ${action.position} of the deck` : 'back in the deck'}`;
      }
      if (OBJECTIVES[action.card]?.type === 'secret') return 'shuffled a secret objective back into the deck';
      return `put ${cardName(action.card)} back in its deck`;
    case 'card/score':
      return `${action.scored ? 'scored' : 'unscored'} ${OBJECTIVES[action.card]?.name ?? 'an objective'}`;
    case 'card/purge':
      return `purged ${cardName(action.card)}`;
    case 'relic/exhaust':
      return `${action.exhausted ? 'exhausted' : 'readied'} ${cardName(action.card)}`;
    case 'agenda/enact':
      return `enacted the law ${cardName(action.card)}`;
    case 'agenda/elect':
      return action.elected ? `elected ${action.elected} for ${cardName(action.card)}` : `cleared the election on ${cardName(action.card)}`;
    case 'strategy/pick':
      return action.player
        ? `gave ${STRATEGY_CARDS[action.id]?.name} to ${action.player}`
        : `returned ${STRATEGY_CARDS[action.id]?.name} to the pool`;
    case 'strategy/exhaust':
      return `${action.exhausted ? 'used' : 'readied'} ${STRATEGY_CARDS[action.id]?.name}`;
    case 'strategy/tradeGoods':
      return `${action.amount > 0 ? 'added' : 'removed'} ${Math.abs(action.amount)} trade good${Math.abs(action.amount) === 1 ? '' : 's'} on ${STRATEGY_CARDS[action.id]?.name}`;
    case 'strategy/clearTradeGoods': {
      const total = state.cards.strategy.reduce((n, s) => n + s.tradeGoods, 0);
      return `removed all ${total} trade good${total === 1 ? '' : 's'} from the strategy cards`;
    }
    case 'strategy/returnAll':
      return 'returned all strategy cards';
    case 'seat/color':
      return `picked the colour ${action.color}`;
    case 'seat/faction':
      return action.faction ? `picked ${FACTIONS[action.faction]?.name ?? action.faction}` : 'cleared their faction';
    case 'seat/bonusVp':
      return `${action.amount > 0 ? 'gave' : 'took'} ${Math.abs(action.amount)} VP ${action.amount > 0 ? 'to' : 'from'} ${action.player}`;
    case 'seat/tradeGoods':
      return `${action.amount > 0 ? 'gained' : 'spent'} ${Math.abs(action.amount)} trade good${Math.abs(action.amount) === 1 ? '' : 's'}`;
    case 'seat/commodities':
      return `${action.amount > 0 ? 'gained' : 'lost'} ${Math.abs(action.amount)} commodit${Math.abs(action.amount) === 1 ? 'y' : 'ies'}`;
    case 'seat/commodityMax':
      return `set their commodity limit to ${action.value}`;
    case 'seat/replenish':
      return 'replenished commodities';
    case 'seat/convert':
      return `converted ${action.amount} commodit${action.amount === 1 ? 'y' : 'ies'} to trade goods`;
    case 'seat/give':
      return `gave ${action.amount} ${action.kind === 'tradeGoods' ? 'trade good' : 'commodit'}${action.kind === 'tradeGoods' ? (action.amount === 1 ? '' : 's') : action.amount === 1 ? 'y' : 'ies'} to ${action.to}`;
    case 'seat/tokens':
      return `${action.amount > 0 ? 'added' : 'removed'} a command token ${action.amount > 0 ? 'to' : 'from'} their ${action.pool} pool`;
    case 'seat/readyAll':
      return 'readied all planets and technologies';
    case 'tech/research':
      return `researched ${TECHNOLOGIES[action.tech]?.name ?? 'a technology'}`;
    case 'tech/remove':
      return `removed ${TECHNOLOGIES[action.tech]?.name ?? 'a technology'}`;
    case 'tech/exhaust':
      return `${action.exhausted ? 'exhausted' : 'readied'} ${TECHNOLOGIES[action.tech]?.name ?? 'a technology'}`;
    case 'planet/control':
      return action.player ? `took control of ${action.planet}` : `gave up ${action.planet}`;
    case 'planet/exhaust':
      return `${action.exhausted ? 'exhausted' : 'readied'} ${action.planet}`;
    case 'promissory/give': {
      const note = promissoryNote(action.note);
      if (action.to === action.owner) return `returned ${action.owner}'s ${note?.name ?? 'promissory note'}`;
      // Notes in hand are secret; ones that go straight into play aren't.
      return note?.playImmediately ? `gave ${note.name} to ${action.to}` : `gave a promissory note to ${action.to}`;
    }
    case 'promissory/play':
      return `${action.inPlay ? 'played' : 'took back'} ${action.owner}'s ${promissoryNote(action.note)?.name ?? 'promissory note'}`;
    case 'token/place':
      return action.from === 'speaker'
        ? `put the speaker token in ${placeName(state, action.piece.x, action.piece.y)}`
        : `placed a command token from ${action.from} in ${placeName(state, action.piece.x, action.piece.y)}`;
    case 'token/return':
      return piece?.kind === 'speaker' ? `gave the speaker token to ${action.player}` : `picked up a command token into ${action.to}`;
    case 'speaker/set':
      return action.player ? `made ${action.player} the speaker` : 'cleared the speaker';
    case 'battle/start': {
      const { attacker, defender, kind, system, planet, cannonOnly, landing } = action.battle;
      const where = planet ?? (state.tiles[system] ? placeName(state, ...pointOf(state, system)) : 'empty space');
      if (cannonOnly) return `started space cannon offense at ${where}: ${attacker.color} firing at ${defender.color}`;
      if (landing) return `started ground combat on ${where}: ${attacker.color} landing against ${defender.color}`;
      return `started ${kind} combat ${planet ? 'on' : 'in'} ${where}: ${attacker.color} attacking ${defender.color}`;
    }
    case 'battle/swap':
      return 'swapped attacker and defender';
    case 'battle/roll': {
      const hits = rollHits(action.roll);
      const kind = ROLL_KINDS.find((k) => k.kind === action.roll.kind)?.label.toLowerCase();
      const color = state.battle?.[action.side].color;
      return `rolled ${kind} for ${color ?? action.side}${action.roll.rerollOf ? ' (re-roll)' : ''}: ${hits} hit${hits === 1 ? '' : 's'}`;
    }
    case 'battle/hit': {
      const unit = state.battle?.[action.side].units.find((u) => u.piece === action.piece);
      const name = unit ? (PIECE_NAMES[unit.kind] ?? unit.kind) : 'unit';
      const color = state.battle?.[action.side].color ?? '';
      return action.hit === 'sustain' ? `had a ${color} ${name} sustain damage` : `destroyed a ${color} ${name}`;
    }
    case 'battle/skipHits': {
      const b = state.battle;
      const skipped = b ? hitsToAssign(b, action.side) : 0;
      return `left ${skipped} hit${skipped === 1 ? '' : 's'} on ${b?.[action.side].color ?? action.side} unassigned`;
    }
    case 'battle/repair': {
      const unit = state.battle?.[action.side].units.find((u) => u.piece === action.piece);
      const name = unit ? (PIECE_NAMES[unit.kind] ?? unit.kind) : 'unit';
      return `repaired a ${state.battle?.[action.side].color ?? ''} ${name}`;
    }
    case 'battle/undoHits':
      return `undid ${state.battle?.[action.side].color ?? action.side}'s hits and repairs this round`;
    case 'battle/nextRound': {
      const b = state.battle;
      return b ? `ended combat round ${b.round} (${sideHits(b.attacker)} hits vs ${sideHits(b.defender)})` : 'ended a combat round';
    }
    case 'battle/end':
      return action.apply ? 'ended the battle and applied the results' : 'cancelled the battle';
    case 'dice/roll': {
      if (action.roll.kind === 'free') return `rolled ${describeFreeRoll(action.roll)}`;
      const hits = rollHits(action.roll);
      const dice = action.roll.groups.reduce((n, g) => n + g.results.length, 0);
      const kind = ROLL_KINDS.find((k) => k.kind === action.roll.kind)?.label.toLowerCase();
      return `rolled ${kind}${action.roll.rerollOf ? ' (re-roll)' : ''}: ${hits} hit${hits === 1 ? '' : 's'} from ${dice} ${dice === 1 ? 'die' : 'dice'}`;
    }
  }
}
