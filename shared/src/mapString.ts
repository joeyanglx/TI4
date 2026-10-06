import { hexRing, type Hex } from './hex';
import { makeTile, type Tile } from './state';
import { MECATOL_REX } from './systems';

const MAX_RINGS = 8;

/**
 * Parse a TTS / map generator map string, e.g. "{18} 26 41 ... 84A3".
 * Tiles are listed ring by ring from the top, clockwise; Mecatol is implied
 * unless the string starts with "{id}". "0" or "-1" means an empty hex, and a
 * trailing digit after a hyperlane letter ("84A3") is its rotation.
 */
export function parseMapString(input: string): Record<string, Tile> {
  let tokens = input.trim().split(/[\s,]+/).filter(Boolean);
  let center = MECATOL_REX;
  const centerMatch = tokens[0]?.match(/^\{(.+)\}$/);
  if (centerMatch) {
    center = centerMatch[1];
    tokens = tokens.slice(1);
  }

  const hexes: Hex[] = [];
  for (let ring = 1; ring <= MAX_RINGS && hexes.length < tokens.length; ring++) {
    hexes.push(...hexRing(ring));
  }

  const tiles: Record<string, Tile> = {};
  const add = (tile: Tile) => (tiles[tile.id] = tile);
  add(makeTile({ q: 0, r: 0 }, center));
  tokens.forEach((token, i) => {
    const hex = hexes[i];
    if (!hex || token === '0' || token === '-1') return;
    const hyperlane = token.match(/^(\d+[AB])(\d)?$/i);
    if (hyperlane) add(makeTile(hex, hyperlane[1].toUpperCase(), Number(hyperlane[2] ?? 0)));
    else add(makeTile(hex, token));
  });
  return tiles;
}

/** Inverse of parseMapString, for sharing or saving the current layout. */
export function toMapString(tiles: Record<string, Tile>): string {
  const byKey = new Map(Object.values(tiles).map((t) => [`${t.q},${t.r}`, t]));
  let lastRing = 0;
  for (const t of byKey.values()) {
    lastRing = Math.max(lastRing, (Math.abs(t.q) + Math.abs(t.r) + Math.abs(t.q + t.r)) / 2);
  }

  const center = byKey.get('0,0')?.system ?? '0';
  const tokens: string[] = [];
  for (let ring = 1; ring <= lastRing; ring++) {
    for (const hex of hexRing(ring)) {
      const tile = byKey.get(`${hex.q},${hex.r}`);
      if (!tile) tokens.push('0');
      else if (/[AB]$/.test(tile.system)) tokens.push(`${tile.system}${tile.rotation ?? 0}`);
      else tokens.push(tile.system);
    }
  }
  const prefix = center === MECATOL_REX ? '' : `{${center}} `;
  return prefix + tokens.join(' ');
}
