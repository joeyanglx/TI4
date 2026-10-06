import { parseMapString } from './mapString';
import type { Tile } from './state';

export interface MapPreset {
  name: string;
  description: string;
  /** TTS / map generator format, see mapString.ts. */
  mapString: string;
}

/** Ready-made maps that load with one click from the Systems tab. */
export const MAP_PRESETS: MapPreset[] = [
  {
    name: 'Balanced map',
    description: "Saved from the group's game-2 board: three rings, home system slots left empty.",
    mapString:
      '47 47 38 50 46 29 23 26 32 34 44 33 36 39 27 30 45 35 24 42 50 31 0 20 25 37 0 22 43 47 28 0 19 40 21 0',
  },
];

export function presetTiles(preset: MapPreset): Record<string, Tile> {
  return parseMapString(preset.mapString);
}
