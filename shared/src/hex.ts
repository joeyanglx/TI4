// Axial hex coordinates, flat-top orientation (TI4 system tiles are flat-topped).
// Reference: https://www.redblobgames.com/grids/hexagons/

export interface Hex {
  q: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Distance from hex centre to corner, in board pixels. */
export const HEX_SIZE = 100;

const SQRT3 = Math.sqrt(3);

export function hexToPixel({ q, r }: Hex, size = HEX_SIZE): Point {
  return {
    x: size * 1.5 * q,
    y: size * SQRT3 * (r + q / 2),
  };
}

export function pixelToHex({ x, y }: Point, size = HEX_SIZE): Hex {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (SQRT3 / 3) * y) / size;
  return hexRound(q, r);
}

export function hexRound(q: number, r: number): Hex {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

/** Corner points of a flat-top hex centred on the origin, flattened for Konva. */
export function hexCorners(size = HEX_SIZE): number[] {
  const points: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    points.push(size * Math.cos(angle), size * Math.sin(angle));
  }
  return points;
}

const DIRECTIONS: Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** All hexes within `radius` rings of the origin (radius 3 = standard 6-player board). */
export function hexesInRadius(radius: number): Hex[] {
  const result: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      result.push({ q, r });
    }
  }
  return result;
}

export function hexNeighbors(hex: Hex): Hex[] {
  return DIRECTIONS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

export function hexKey({ q, r }: Hex): string {
  return `${q},${r}`;
}
