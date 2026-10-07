import { hexKey, hexToPixel, pixelToHex, type Point } from './hex';
import type { GameState, Tile } from './state';
import { SYSTEMS, type Planet } from './systems';

/** A planet on the board: its circle in board pixels. */
export interface PlanetSpot {
  /** hexKey of the system. */
  system: string;
  planet: Planet;
  x: number;
  y: number;
  radius: number;
}

/** Planet circles on a tile, turned with the tile. */
export function planetSpots(tile: Tile): PlanetSpot[] {
  const centre = hexToPixel(tile);
  const angle = ((tile.rotation ?? 0) * Math.PI) / 3;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return (SYSTEMS[tile.system]?.planets ?? [])
    .filter((p) => p.x !== undefined && p.y !== undefined)
    .map((planet) => ({
      system: tile.id,
      planet,
      x: centre.x + planet.x! * cos - planet.y! * sin,
      y: centre.y + planet.x! * sin + planet.y! * cos,
      radius: planet.radius ?? 30,
    }));
}

/** The planet whose circle contains a board point, if any. Anything else on a tile is in space. */
export function planetAt(state: GameState, point: Point): PlanetSpot | undefined {
  const tile = state.tiles[hexKey(pixelToHex(point))];
  if (!tile) return undefined;
  return planetSpots(tile).find((spot) => Math.hypot(spot.x - point.x, spot.y - point.y) <= spot.radius);
}
