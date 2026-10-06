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

/** Short label and radius used to draw placeholder pieces until real art exists. */
export const PIECE_STYLE: Record<PieceKind, { label: string; radius: number }> = {
  warsun: { label: 'WS', radius: 22 },
  dreadnought: { label: 'DN', radius: 20 },
  carrier: { label: 'CV', radius: 19 },
  cruiser: { label: 'CA', radius: 17 },
  destroyer: { label: 'DD', radius: 15 },
  fighter: { label: 'F', radius: 11 },
  flagship: { label: 'FS', radius: 22 },
  infantry: { label: 'I', radius: 11 },
  mech: { label: 'M', radius: 14 },
  pds: { label: 'PDS', radius: 15 },
  spacedock: { label: 'SD', radius: 18 },
  command: { label: 'CT', radius: 16 },
  control: { label: '⚑', radius: 14 },
  speaker: { label: 'SPEAKER', radius: 24 },
};
