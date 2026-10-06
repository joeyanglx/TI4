import systemsJson from './data/systems.json';

// System data comes from the KeeganW/ti4 map generator (official tiles only):
// base game 1–50, Prophecy of Kings 51–91, Thunder's Edge 92–118.

export type SystemType = 'green' | 'blue' | 'red' | 'hyperlane';
export type Expansion = 'base' | 'pok' | 'te';

export interface Planet {
  name: string;
  resources: number;
  influence: number;
  traits?: ('cultural' | 'hazardous' | 'industrial')[];
  specialties?: string[];
  ability?: string;
}

export interface SystemInfo {
  id: string;
  type: SystemType;
  expansion: Expansion;
  faction?: string;
  wormholes: string[];
  anomalies: string[];
  planets: Planet[];
  /** Hyperlane connections as pairs of hex edges (0 = top, clockwise). */
  hyperlanes?: [number, number][];
}

export const SYSTEMS = systemsJson as unknown as Record<string, SystemInfo>;

export const MECATOL_REX = '18';
