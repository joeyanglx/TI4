export const PLAYER_COLORS = {
  red: '#d33a3a',
  blue: '#3a6fd3',
  green: '#3aa655',
  yellow: '#e0c12e',
  purple: '#8e4fd1',
  black: '#3b3b3b',
  orange: '#e8862a',
  pink: '#e05fa8',
} as const;

export type PlayerColor = keyof typeof PLAYER_COLORS;

export const UNIT_KINDS = [
  'warsun',
  'dreadnought',
  'carrier',
  'cruiser',
  'destroyer',
  'fighter',
  'flagship',
  'infantry',
  'mech',
  'pds',
  'spacedock',
] as const;

export const TOKEN_KINDS = ['command', 'control'] as const;

export type UnitKind = (typeof UNIT_KINDS)[number];
export type TokenKind = (typeof TOKEN_KINDS)[number];
/** The speaker token is a piece only while it's on the map; there's just one, so it's not in the palette. */
export type PieceKind = UnitKind | TokenKind | 'speaker';

export type PieceShapeKind = 'circle' | 'square' | 'hexagon' | 'triangle';

/**
 * How placeholder pieces are drawn until real art exists. Ships are circles,
 * ground forces squares, space docks hexagons and command tokens triangles.
 */
export const PIECE_STYLE: Record<PieceKind, { label: string; radius: number; shape: PieceShapeKind }> = {
  warsun: { label: 'WS', radius: 22, shape: 'circle' },
  dreadnought: { label: 'DN', radius: 20, shape: 'circle' },
  carrier: { label: 'CV', radius: 19, shape: 'circle' },
  cruiser: { label: 'CA', radius: 17, shape: 'circle' },
  destroyer: { label: 'DD', radius: 15, shape: 'circle' },
  fighter: { label: 'F', radius: 11, shape: 'circle' },
  flagship: { label: 'FS', radius: 22, shape: 'circle' },
  infantry: { label: 'I', radius: 11, shape: 'square' },
  mech: { label: 'M', radius: 14, shape: 'square' },
  pds: { label: 'PDS', radius: 15, shape: 'circle' },
  spacedock: { label: 'SD', radius: 18, shape: 'hexagon' },
  command: { label: 'CT', radius: 16, shape: 'triangle' },
  control: { label: '⚑', radius: 14, shape: 'circle' },
  speaker: { label: 'SPEAKER', radius: 24, shape: 'circle' },
};
