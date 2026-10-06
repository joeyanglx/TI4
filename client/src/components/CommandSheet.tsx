import {
  TECHNOLOGIES,
  TOKEN_POOLS,
  editionTechnologies,
  reinforcements,
  seatOf,
  type Action,
  type GameState,
  type TechnologyInfo,
} from '@ti4/shared';
import { TECH_TYPES, describeRequirements, techColor } from '../techs';
import { CardDetails } from './cardParts';

interface Props {
  state: GameState;
  me: string;
  dispatch: (action: Action) => void;
}

const POOL_LABELS = { tactic: 'Tactic', fleet: 'Fleet', strategy: 'Strategy' };

/** Your command sheet's token pools; reinforcements count down as tokens go onto the sheet or the board. */
export function TokenSection({ state, me, dispatch }: Props) {
  const seat = seatOf(state.seats, me);
  const left = reinforcements(state, me);
  return (
    <section>
      <h2>Command tokens</h2>
      {TOKEN_POOLS.map((pool) => (
        <div key={pool} className="counter-row">
          <span>{POOL_LABELS[pool]}</span>
          <span className="counter">
            <button onClick={() => dispatch({ type: 'seat/tokens', player: me, pool, amount: -1 })}>−</button>
            <b>{seat.tokens[pool]}</b>
            <button
              disabled={left <= 0}
              onClick={() => dispatch({ type: 'seat/tokens', player: me, pool, amount: 1 })}
            >
              +
            </button>
          </span>
        </div>
      ))}
      <div className="counter-row">
        <span>Reinforcements</span>
        <span className={`counter ${left < 0 ? 'warning' : ''}`} title="16 minus tokens on your sheet and the board">
          <b>{left}</b>
        </span>
      </div>
      <p className="hint">Command tokens you drag onto the board in your colour count against reinforcements.</p>
    </section>
  );
}

export function TechSection({ state, me, dispatch }: Props) {
  const seat = seatOf(state.seats, me);
  const available = editionTechnologies(state.cards.edition).filter((id) => !seat.technologies.includes(id));
  const generic = (type: string) => available.filter((id) => !TECHNOLOGIES[id].faction && TECHNOLOGIES[id].type === type);
  const factions = [...new Set(available.map((id) => TECHNOLOGIES[id].faction).filter((f): f is string => !!f))].sort();

  return (
    <section>
      <h2>Technology ({seat.technologies.length})</h2>
      {seat.technologies.map((id) => {
        const info = TECHNOLOGIES[id];
        const exhausted = seat.exhaustedTechnologies.includes(id);
        return (
          <div key={id} className={`card-row ${exhausted ? 'exhausted' : ''}`}>
            <span className="tech-dot" style={{ background: techColor(id) }} />
            <CardDetails title={info.name} subtitle={subtitle(info)}>
              <p className="tech-text">{info.text}</p>
            </CardDetails>
            <div className="card-actions">
              <button
                onClick={() => dispatch({ type: 'tech/exhaust', player: me, tech: id, exhausted: !exhausted })}
              >
                {exhausted ? 'Ready' : 'Exhaust'}
              </button>
              <button title="Remove" onClick={() => dispatch({ type: 'tech/remove', player: me, tech: id })}>
                ×
              </button>
            </div>
          </div>
        );
      })}
      <div className="row">
        <select
          value=""
          onChange={(e) => e.target.value && dispatch({ type: 'tech/research', player: me, tech: e.target.value })}
        >
          <option value="">Research a technology…</option>
          {TECH_TYPES.map(({ type, label }) => (
            <optgroup key={type} label={label}>
              {generic(type).map((id) => (
                <option key={id} value={id}>
                  {optionLabel(TECHNOLOGIES[id])}
                </option>
              ))}
            </optgroup>
          ))}
          {factions.map((faction) => (
            <optgroup key={faction} label={faction}>
              {available
                .filter((id) => TECHNOLOGIES[id].faction === faction)
                .map((id) => (
                  <option key={id} value={id}>
                    {optionLabel(TECHNOLOGIES[id])}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <p className="hint">Prerequisites aren't checked. Ready all on your planets also readies technologies.</p>
    </section>
  );
}

function subtitle(info: TechnologyInfo) {
  return [info.faction, info.requirements && `needs ${describeRequirements(info.requirements)}`]
    .filter(Boolean)
    .join(' · ');
}

function optionLabel(info: TechnologyInfo) {
  return info.requirements ? `${info.name} (${describeRequirements(info.requirements)})` : info.name;
}
