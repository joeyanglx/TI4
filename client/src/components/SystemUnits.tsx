import {
  PLAYER_COLORS,
  UNIT_KINDS,
  fightsIn,
  hexKey,
  pieceUnitStats,
  pixelToHex,
  planetAt,
  stackSize,
  type GameState,
  type PlayerColor,
} from '@ti4/shared';

const SPACE = 'Space';

interface Line {
  name: string;
  count: number;
  damaged: number;
}

/** Every unit in a system, by colour and then by where it is (space or a planet), stacks of the same unit added up. */
export function systemUnits(state: GameState, system: string) {
  const byColor = new Map<PlayerColor, { owner?: string; places: Map<string, Map<string, Line>> }>();
  for (const piece of Object.values(state.pieces)) {
    if (!(UNIT_KINDS as readonly string[]).includes(piece.kind)) continue;
    if (hexKey(pixelToHex(piece)) !== system) continue;
    const stats = pieceUnitStats(state, piece);
    const entry = byColor.get(piece.color) ?? { owner: stats?.owner, places: new Map() };
    // Ships are always in space, even when drawn over a planet.
    const place = (!fightsIn(piece.kind, 'space') && planetAt(state, piece)?.planet.name) || SPACE;
    const lines = entry.places.get(place) ?? new Map<string, Line>();
    const name = stats?.unit.name.trim() ?? piece.kind[0].toUpperCase() + piece.kind.slice(1);
    const line = lines.get(name) ?? { name, count: 0, damaged: 0 };
    line.count += stackSize(piece);
    line.damaged += piece.damaged ?? 0;
    lines.set(name, line);
    entry.places.set(place, lines);
    byColor.set(piece.color, entry);
  }
  return byColor;
}

/** The units list shown in a system's right-click menu. */
export function SystemUnitsList({ units }: { units: ReturnType<typeof systemUnits> }) {
  if (units.size === 0) return <div className="piece-menu-note">No units in this system.</div>;
  return (
    <div className="system-units">
      {[...units].map(([color, { owner, places }]) => (
        <div key={color} className="system-units-color">
          <div className="system-units-head">
            <span className="player-dot" style={{ background: PLAYER_COLORS[color] }} />
            <b>{owner ?? color}</b>
            {owner && <span className="muted">{color}</span>}
          </div>
          {/* Space first, then planets in the order they were found. */}
          {[...places]
            .sort(([a], [b]) => Number(b === SPACE) - Number(a === SPACE))
            .map(([place, lines]) => (
              <div key={place} className="system-units-place">
                <span className="muted">{place}:</span>{' '}
                {[...lines.values()]
                  .map((l) => `${l.count} × ${l.name}${l.damaged ? ` (${l.damaged} damaged)` : ''}`)
                  .join(', ')}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
