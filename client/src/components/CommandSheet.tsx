import {
  TECHNOLOGIES,
  editionTechnologies,
  seatOf,
  type Action,
  type GameState,
  type TechnologyInfo,
} from '@ti4/shared';
import { TECH_TYPES, describeRequirements, techColor } from '../techs';
import { CardDetails } from './cardParts';
import { SpeakerBadge, TokenPools, acceptTokens, readTokenDrag } from './TokenPools';

interface Props {
  state: GameState;
  me: string;
  dispatch: (action: Action) => void;
}

interface TokenProps extends Props {
  players: string[];
}

/**
 * Your command sheet, drawn like the overview: drag tokens between pools, onto the map, or from the map
 * back onto a pool. The speaker token lives here too while you hold it (or nobody does).
 */
export function TokenSection({ state, me, players, dispatch }: TokenProps) {
  const speakerOnMap = Object.values(state.pieces).some((p) => p.kind === 'speaker');
  const canDragSpeaker = state.speaker === me || (!state.speaker && !speakerOnMap);
  return (
    <section
      // Dropping the speaker token from the map anywhere on this section makes you speaker.
      data-token-slot="speaker"
      data-player={me}
      onDragOver={acceptTokens}
      onDrop={(e) => {
        if (readTokenDrag(e)?.from === 'speaker') dispatch({ type: 'speaker/set', player: me });
      }}
    >
      <h2>Command tokens</h2>
      <TokenPools state={state} player={me} dispatch={dispatch} />
      <div className="row speaker-row">
        {canDragSpeaker ? (
          <SpeakerBadge player={state.speaker ?? ''} draggable />
        ) : (
          <span className="muted">
            {state.speaker ? `${state.speaker} is the speaker` : 'Speaker token is on the map'}
          </span>
        )}
        <select
          value=""
          onChange={(e) => e.target.value && dispatch({ type: 'speaker/set', player: e.target.value })}
          title="Hand the speaker token to a player"
        >
          <option value="">Give speaker to…</option>
          {players.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <p className="hint">
        Drag tokens between pools or onto the map, and drag tokens on the map back onto a pool (onto
        reinforcements to just remove them). Everyone sees the result in the Overview.
      </p>
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
