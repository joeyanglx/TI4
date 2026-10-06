import { SYSTEMS } from '@ti4/shared';

const EXPANSION_NAMES = { base: 'Base game', pok: 'Prophecy of Kings', te: "Thunder's Edge" };

/** Info panel for the system under the mouse. */
export function SystemCard({ system }: { system: string }) {
  const info = SYSTEMS[system];
  if (!info) return null;
  const extras = [...info.anomalies, ...info.wormholes.map((w) => `${w} wormhole`)];
  return (
    <div className="system-card">
      <div className="system-card-title">
        System {info.id}
        <span>{EXPANSION_NAMES[info.expansion]}</span>
      </div>
      {info.faction && <div className="faction">{info.faction}</div>}
      {info.planets.map((p) => (
        <div key={p.name} className="planet">
          <div className="planet-row">
            <strong>{p.name}</strong>
            <span className="ri">
              <span className="res">{p.resources}</span>
              <span className="inf">{p.influence}</span>
            </span>
          </div>
          {!!(p.traits?.length || p.specialties?.length) && (
            <div className="tags">{[...(p.traits ?? []), ...(p.specialties ?? [])].join(' · ')}</div>
          )}
          {p.ability && <div className="ability">{p.ability}</div>}
        </div>
      ))}
      {extras.length > 0 && <div className="tags">{extras.join(' · ').replaceAll('-', ' ')}</div>}
      {info.type === 'hyperlane' && <div className="tags">Hyperlane</div>}
      {info.type !== 'hyperlane' && info.planets.length === 0 && extras.length === 0 && (
        <div className="tags">Empty space</div>
      )}
    </div>
  );
}
