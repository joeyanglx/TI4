import { FACTIONS, type StartingUnit } from './cards';
import { hexKey, hexToPixel, pixelToHex, type Point } from './hex';
import { PIECE_STYLE } from './pieces';
import { planetSpots, type PlanetSpot } from './planets';
import { seatOf } from './players';
import type { GameState, Piece, Tile } from './state';
import { SYSTEMS } from './systems';

/** What setting up a player's home system adds: their starting units, and the home planets they control. */
export interface HomeSetup {
  tile: Tile;
  pieces: Piece[];
  planets: string[];
}

/** The faction's home system on the map, if it's been placed. */
export function homeTile(state: GameState, faction: string): Tile | undefined {
  const ids = FACTIONS[faction]?.homeSystems ?? [];
  const tiles = Object.values(state.tiles);
  for (const id of ids) {
    const tile = tiles.find((t) => t.system === id);
    if (tile) return tile;
  }
  return undefined;
}

/** Whether a player already has units in their home system, so setting it up again would double them. */
export function hasUnitsAtHome(state: GameState, player: string): boolean {
  const seat = seatOf(state.seats, player);
  const tile = seat.faction && homeTile(state, seat.faction);
  return !!tile && Object.values(state.pieces).some((p) => p.color === seat.color && hexKey(pixelToHex(p)) === tile.id && p.kind !== 'command' && p.kind !== 'control');
}

/**
 * A player's starting units placed in their home system (ships in space, the rest on their planets) and
 * their home planets. `newId` makes piece ids, so the result can travel in an action and replay exactly.
 */
export function homeSetup(state: GameState, player: string, newId: () => string): HomeSetup | undefined {
  const seat = seatOf(state.seats, player);
  const faction = seat.faction && FACTIONS[seat.faction];
  const tile = seat.faction && homeTile(state, seat.faction);
  if (!faction || !tile || !seat.color) return undefined;

  const spots = planetSpots(tile);
  const space = spacePoints(tile, spots);
  const onPlanet = new Map<PlanetSpot, number>();
  let shipSlot = 0;
  const pieces = mergeStacks(faction.startingFleet ?? []).map(({ unit, count, planet }) => {
    let point: Point;
    const spot = isShip(unit) ? undefined : (planet && spots.find((s) => matches(s.planet.name, planet))) || spots[0];
    if (spot) {
      // Spread a planet's stacks around its centre so they don't sit on top of each other.
      const i = onPlanet.get(spot) ?? 0;
      onPlanet.set(spot, i + 1);
      const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      const r = i === 0 ? 0 : spot.radius * 0.5;
      point = { x: spot.x + r * Math.cos(angle), y: spot.y + r * Math.sin(angle) };
    } else {
      point = space[shipSlot++ % space.length];
    }
    return { id: newId(), kind: unit, color: seat.color!, x: point.x, y: point.y, ...(count > 1 && { count }) };
  });
  return { tile, pieces, planets: (SYSTEMS[tile.system]?.planets ?? []).map((p) => p.name) };
}

/** "Hercant" matches the fleet's "hercant", "Mez Lo Orz Fei Zsha" its short "mez", "[0.0.0]" its "0.0.0". */
function matches(name: string, alias: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(name).startsWith(norm(alias));
}

/** One stack per unit and place, e.g. Hacan's infantry on Arretze and on Kamdorn stay apart. */
function mergeStacks(fleet: StartingUnit[]): StartingUnit[] {
  const merged = new Map<string, StartingUnit>();
  for (const u of fleet) {
    const key = `${u.unit}|${isShip(u.unit) ? '' : (u.planet ?? '')}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, count: prev.count + u.count } : { ...u });
  }
  return [...merged.values()];
}

const SHIPS = new Set(['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter']);
function isShip(unit: string): boolean {
  return SHIPS.has(unit);
}

/** Points in the system's space, clear of its planets, for ship stacks. */
function spacePoints(tile: Tile, spots: PlanetSpot[]): Point[] {
  const centre = hexToPixel(tile);
  const margin = PIECE_STYLE.carrier.radius;
  const candidates: Point[] = [];
  for (const r of [60, 40, 72]) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      candidates.push({ x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) });
    }
  }
  const clear = candidates.filter((p) => spots.every((s) => Math.hypot(p.x - s.x, p.y - s.y) > s.radius + margin));
  return clear.length ? clear : [centre];
}
