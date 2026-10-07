import { useMemo } from 'react';
import { PLANETS, SYSTEMS, type Action, type GameState } from '@ti4/shared';
import { CardDetails, GiveSelect } from './cardParts';

interface Props {
  state: GameState;
  players: string[];
  me: string;
  dispatch: (action: Action) => void;
}

/** Your planet cards: exhaust them to spend resources or influence, ready them in the status phase. */
export function YourPlanets({ state, players, me, dispatch }: Props) {
  const mine = ownedBy(state, me);
  const onMap = useMemo(() => planetsOnMap(state), [state.tiles]);
  const gainable = onMap.filter((name) => state.planets[name]?.owner !== me);
  const ready = totals(state, mine, true);
  const all = totals(state, mine, false);

  return (
    <section>
      <h2>Your planets ({mine.length})</h2>
      <p className="planet-totals">
        Ready: <span className="res">{ready.resources}</span> <span className="inf">{ready.influence}</span>
        <span className="muted">
          {' '}
          of {all.resources} / {all.influence}
        </span>
      </p>
      {mine.map((name) => {
        const info = PLANETS[name];
        const exhausted = state.planets[name].exhausted;
        return (
          <div key={name} className={`card-row ${exhausted ? 'exhausted' : ''}`}>
            <span className="ri">
              <span className="res">{info.resources}</span>
              <span className="inf">{info.influence}</span>
            </span>
            <PlanetText name={name} />
            <div className="card-actions">
              <GiveSelect
                players={players}
                exclude={me}
                onGive={(p) => dispatch({ type: 'planet/control', planet: name, player: p })}
              />
              <button onClick={() => dispatch({ type: 'planet/exhaust', planet: name, exhausted: !exhausted })}>
                {exhausted ? 'Ready' : 'Exhaust'}
              </button>
              <button title="Lose control" onClick={() => dispatch({ type: 'planet/control', planet: name })}>
                ×
              </button>
            </div>
          </div>
        );
      })}
      <div className="row">
        <select
          value=""
          onChange={(e) => e.target.value && dispatch({ type: 'planet/control', planet: e.target.value, player: me })}
        >
          <option value="">Gain control of a planet…</option>
          {gainable.map((name) => {
            const owner = state.planets[name]?.owner;
            return (
              <option key={name} value={name}>
                {name} ({PLANETS[name].resources}/{PLANETS[name].influence}){owner ? ` · ${owner}'s` : ''}
              </option>
            );
          })}
        </select>
        <button disabled={!mine.length} onClick={() => dispatch({ type: 'seat/readyAll', player: me })}>
          Ready all
        </button>
      </div>
      <p className="hint">Only planets on the map are listed. A newly gained planet comes in exhausted. Ready all also readies your technologies.</p>
    </section>
  );
}

function PlanetText({ name }: { name: string }) {
  const info = PLANETS[name];
  const tags = [...(info.traits ?? []), ...(info.specialties ?? [])].join(' · ').replaceAll('-', ' ');
  return (
    <CardDetails title={name} subtitle={tags || undefined}>
      <p className="muted">System {info.system}</p>
      {info.ability && <p>{info.ability}</p>}
    </CardDetails>
  );
}

function ownedBy(state: GameState, player: string): string[] {
  return Object.entries(state.planets)
    .filter(([name, p]) => p.owner === player && PLANETS[name])
    .map(([name]) => name)
    .sort();
}

function totals(state: GameState, names: string[], readyOnly: boolean) {
  let resources = 0;
  let influence = 0;
  for (const name of names) {
    if (readyOnly && state.planets[name].exhausted) continue;
    resources += PLANETS[name].resources;
    influence += PLANETS[name].influence;
  }
  return { resources, influence };
}

function planetsOnMap(state: GameState): string[] {
  const names = Object.values(state.tiles).flatMap((t) => SYSTEMS[t.system]?.planets.map((p) => p.name) ?? []);
  return [...new Set(names)].sort();
}
