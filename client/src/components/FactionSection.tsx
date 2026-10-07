import {
  FACTIONS,
  SYSTEMS,
  TECHNOLOGIES,
  applyAction,
  editionFactions,
  editionTechnologies,
  hasUnitsAtHome,
  homeSetup,
  homeTile,
  seatOf,
  type Action,
  type CardExpansion,
  type GameState,
} from '@ti4/shared';
import { newId } from '../id';
import { FactionIcon } from './cardParts';

interface Props {
  state: GameState;
  me: string;
  dispatch: (action: Action) => void;
}

const EXPANSION_LABELS: Record<CardExpansion, string> = {
  base: 'Base game',
  pok: 'Prophecy of Kings',
  te: "Thunder's Edge",
};

/** Starting units and home planets for `player`, if their home system is on the map. */
function setupAction(state: GameState, player: string): Action | undefined {
  const setup = homeSetup(state, player, newId);
  return setup && { type: 'seat/setupHome', player, pieces: setup.pieces, planets: setup.planets };
}

/**
 * Pick your faction at the start of the game: it shows as an icon by your name, gives your starting techs, and
 * sets up your home system (starting units and home planets) if it's on the map.
 */
export function FactionSection({ state, me, dispatch }: Props) {
  const seat = seatOf(state.seats, me);
  const factions = editionFactions(state.cards.edition);
  const info = seat.faction ? FACTIONS[seat.faction] : undefined;
  const available = new Set(editionTechnologies(state.cards.edition));
  const choice = info?.choose;
  const options = choice?.options.filter((id) => available.has(id)) ?? [];
  const chosen = options.filter((id) => seat.technologies.includes(id)).length;

  return (
    <section>
      <h2>Faction</h2>
      <div className="row faction-row">
        {seat.faction && <FactionIcon faction={seat.faction} size={28} />}
        <select
          value={seat.faction ?? ''}
          onChange={(e) => {
            const pick: Action = { type: 'seat/faction', player: me, faction: e.target.value || undefined };
            dispatch(pick);
            // Set up the new faction's home straight away, unless you already have units there.
            const picked = applyAction(state, pick);
            const setup = pick.faction && !hasUnitsAtHome(picked, me) ? setupAction(picked, me) : undefined;
            if (setup) dispatch(setup);
          }}
        >
          <option value="">Choose your faction…</option>
          {(['base', 'pok', 'te'] as const).map((expansion) => (
            <optgroup key={expansion} label={EXPANSION_LABELS[expansion]}>
              {factions
                .filter((f) => FACTIONS[f].expansion === expansion)
                .sort((a, b) => sortName(FACTIONS[a].name).localeCompare(sortName(FACTIONS[b].name)))
                .map((f) => (
                  <option key={f} value={f}>
                    {FACTIONS[f].name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      {seat.faction && <HomeSetupRow state={state} me={me} faction={seat.faction} dispatch={dispatch} />}
      {info && info.startingTech.length > 0 && (
        <p className="hint">
          Starting technologies added: {info.startingTech.map((id) => TECHNOLOGIES[id]?.name).join(', ')}.
        </p>
      )}
      {info && !info.startingTech.length && !choice && <p className="hint">This faction has no starting technologies.</p>}
      {choice && (
        <>
          <p className="hint">
            {info.name} chooses {choice.count} starting{' '}
            {choice.count === 1 ? 'technology' : 'technologies'}
            {options.length
              ? ` (${Math.min(chosen, choice.count)}/${choice.count} picked):`
              : '. Pick them from Research a technology below.'}
          </p>
          {options.length > 0 && (
            <div className="tech-choices">
              {options.map((id) => {
                const has = seat.technologies.includes(id);
                return (
                  <button
                    key={id}
                    className={has ? 'selected' : ''}
                    disabled={!has && chosen >= choice.count}
                    onClick={() => dispatch({ type: has ? 'tech/remove' : 'tech/research', player: me, tech: id })}
                  >
                    {TECHNOLOGIES[id].name}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function HomeSetupRow({ state, me, faction, dispatch }: Props & { faction: string }) {
  const tile = homeTile(state, faction);
  if (!tile) {
    return <p className="hint">Put your home system on the map, then set it up here to get your starting units.</p>;
  }
  const done = hasUnitsAtHome(state, me);
  const planets = SYSTEMS[tile.system]?.planets.map((p) => p.name) ?? [];
  return (
    <div className="row">
      <button
        disabled={done}
        title={done ? 'You already have units in your home system' : undefined}
        onClick={() => {
          const action = setupAction(state, me);
          if (action) dispatch(action);
        }}
      >
        Set up home system
      </button>
      <span className="muted">
        {done ? 'Starting units placed' : 'Starting units'}
        {planets.length > 0 && ` · ${planets.join(', ')}`}
      </span>
    </div>
  );
}

/** "The Emirates of Hacan" sorts under E otherwise. */
function sortName(name: string) {
  return name.replace(/^The /, '');
}
