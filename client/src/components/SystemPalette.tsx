import { useMemo, useState } from 'react';
import {
  MAP_PRESETS,
  SYSTEMS,
  defaultBoard,
  presetTiles,
  parseMapString,
  toMapString,
  type Action,
  type SystemInfo,
  type SystemType,
  type Tile,
} from '@ti4/shared';
import { SYSTEM_MIME } from '../dnd';
import { systemImageUrl } from '../tiles';

const FILTERS: { label: string; type: SystemType | 'all' }[] = [
  { label: 'All', type: 'all' },
  { label: 'Home', type: 'green' },
  { label: 'Blue', type: 'blue' },
  { label: 'Red', type: 'red' },
  { label: 'Hyperlane', type: 'hyperlane' },
];

const ALL_SYSTEMS = Object.values(SYSTEMS);

interface Props {
  tiles: Record<string, Tile>;
  dispatch: (action: Action) => void;
}

export function SystemPalette({ tiles, dispatch }: Props) {
  const [filter, setFilter] = useState<SystemType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [hideUsed, setHideUsed] = useState(true);

  const used = useMemo(() => new Set(Object.values(tiles).map((t) => t.system)), [tiles]);
  const visible = ALL_SYSTEMS.filter(
    (s) =>
      (filter === 'all' || s.type === filter) &&
      !(hideUsed && used.has(s.id)) &&
      matches(s, search.trim().toLowerCase()),
  );

  return (
    <>
      <div className="presets">
        {MAP_PRESETS.map((preset) => (
          <button
            key={preset.name}
            title={preset.description}
            onClick={() => dispatch({ type: 'map/set', tiles: presetTiles(preset) })}
          >
            Load {preset.name.toLowerCase()}
          </button>
        ))}
      </div>
      <input
        className="search"
        placeholder="Search number, planet, faction…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.type}
            className={`chip ${filter === f.type ? 'selected' : ''}`}
            onClick={() => setFilter(f.type)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={hideUsed} onChange={(e) => setHideUsed(e.target.checked)} />
        Hide systems already on the map
      </label>
      <div className="system-grid">
        {visible.map((s) => (
          <img
            key={s.id}
            src={systemImageUrl(s.id)}
            alt={s.id}
            title={describe(s)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData(SYSTEM_MIME, s.id)}
            loading="lazy"
          />
        ))}
      </div>
      <p className="hint">
        Drag a system onto a hex. In <b>Edit map</b> mode, drag tiles to move or swap them, double-click to rotate,
        right-click to remove.
      </p>
      <MapStringTools tiles={tiles} dispatch={dispatch} />
    </>
  );
}

function MapStringTools({ tiles, dispatch }: Props) {
  const [text, setText] = useState('');
  return (
    <details className="map-tools">
      <summary>Map string</summary>
      <textarea
        rows={4}
        placeholder="Paste a map string, e.g. from a TI4 map generator"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row">
        <button disabled={!text.trim()} onClick={() => dispatch({ type: 'map/set', tiles: parseMapString(text) })}>
          Load
        </button>
        <button onClick={() => setText(toMapString(tiles))}>Show current</button>
        <button onClick={() => dispatch({ type: 'map/set', tiles: defaultBoard().tiles })}>Clear</button>
      </div>
    </details>
  );
}

function matches(s: SystemInfo, query: string) {
  if (!query) return true;
  return (
    s.id.toLowerCase() === query ||
    s.faction?.toLowerCase().includes(query) ||
    s.planets.some((p) => p.name.toLowerCase().includes(query))
  );
}

export function describe(s: SystemInfo) {
  const parts = [s.id, s.faction, ...s.planets.map((p) => `${p.name} ${p.resources}/${p.influence}`)];
  return parts.filter(Boolean).join(' · ');
}
