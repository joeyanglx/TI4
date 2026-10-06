import {
  OBJECTIVES,
  promissoryLocation,
  promissoryNotesOf,
  seatOf,
  type GameState,
  type PromissoryNoteInfo,
} from '@ti4/shared';

/** Everyone who's online or has left a mark on the game, you first. */
export function knownPlayers(state: GameState, online: string[], me: string): string[] {
  const { cards } = state;
  const names = new Set([me, ...online, ...Object.keys(state.seats)]);
  for (const [p, hand] of Object.entries(cards.hands)) if (hand.length) names.add(p);
  for (const s of cards.strategy) if (s.holder) names.add(s.holder);
  for (const scorers of Object.values(cards.scored)) scorers.forEach((p) => names.add(p));
  for (const [p, relics] of Object.entries(cards.relics)) if (relics.length) names.add(p);
  for (const planet of Object.values(state.planets)) if (planet.owner) names.add(planet.owner);
  return [...names];
}

export function victoryPoints(state: GameState, player: string): number {
  let vp = seatOf(state.seats, player).bonusVp;
  for (const [id, scorers] of Object.entries(state.cards.scored)) {
    if (scorers.includes(player)) vp += OBJECTIVES[id]?.points ?? 0;
  }
  // Another player's Support for the Throne in your play area is worth 1 point.
  for (const [key, location] of Object.entries(state.promissory)) {
    const [owner, note] = key.split('/');
    if (note === 'sftt' && location.inPlay && location.holder === player && owner !== player) vp += 1;
  }
  return vp;
}

export interface HeldNote {
  owner: string;
  note: PromissoryNoteInfo;
  holder: string;
  inPlay: boolean;
}

/** Every player's promissory notes and where each one is. */
export function allPromissoryNotes(state: GameState, players: string[]): HeldNote[] {
  return players.flatMap((owner) =>
    promissoryNotesOf(state.cards.edition, seatOf(state.seats, owner).faction).map((note) => ({
      owner,
      note,
      ...promissoryLocation(state, owner, note.id),
    })),
  );
}
