import { randomSeed, setupCards } from './cards';
import { emptyState, makeTile, type GameState } from './state';
import { MECATOL_REX } from './systems';

/** A fresh table: Mecatol Rex in the centre and shuffled card decks, ready for systems to be placed. */
export function defaultBoard(): GameState {
  const state = emptyState();
  const mecatol = makeTile({ q: 0, r: 0 }, MECATOL_REX);
  state.tiles[mecatol.id] = mecatol;
  state.cards = setupCards({ seed: randomSeed(), edition: 'te' });
  return state;
}

/** Fill in parts of the state that rooms saved by older versions don't have. */
export function withDefaults(saved: Partial<GameState>): GameState {
  const fresh = defaultBoard();
  return {
    tiles: saved.tiles ?? fresh.tiles,
    pieces: saved.pieces ?? fresh.pieces,
    // Rooms from before agendas and relics existed get those decks freshly shuffled.
    cards: saved.cards
      ? { ...fresh.cards, ...saved.cards, decks: { ...fresh.cards.decks, ...saved.cards.decks } }
      : fresh.cards,
    seats: saved.seats ?? fresh.seats,
    planets: saved.planets ?? fresh.planets,
  };
}
