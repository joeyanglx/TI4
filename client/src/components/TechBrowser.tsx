import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FACTIONS,
  TECHNOLOGIES,
  editionTechnologies,
  factionTechnologies,
  seatOf,
  type Action,
  type GameState,
  type TechType,
} from '@ti4/shared';
import { TECH_TYPES, describeRequirements } from '../techs';

interface Props {
  state: GameState;
  me: string;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

/** Prerequisite letters on the cards -> tech colour. */
const LETTER_TYPE: Record<string, TechType> = { G: 'biotic', Y: 'cybernetic', B: 'propulsion', R: 'warfare' };

/**
 * Every technology you could research, laid out like the tech tree: one column per colour, then your
 * faction's own technologies (none until you pick a faction).
 */
export function TechBrowser({ state, me, dispatch, onClose }: Props) {
  const seat = seatOf(state.seats, me);
  const edition = state.cards.edition;
  const generic = editionTechnologies(edition).filter((id) => !TECHNOLOGIES[id].factionId);
  const faction = factionTechnologies(edition, seat.faction);

  // Prerequisites are met by technologies of that colour you own (unit upgrades have no colour).
  const owned = new Map<TechType, number>();
  for (const id of seat.technologies) {
    const type = TECHNOLOGIES[id]?.type;
    if (type) owned.set(type, (owned.get(type) ?? 0) + 1);
  }
  const meets = (requirements: string) => {
    const needed = new Map<TechType, number>();
    for (const letter of requirements) needed.set(LETTER_TYPE[letter], (needed.get(LETTER_TYPE[letter]) ?? 0) + 1);
    return [...needed].every(([type, n]) => (owned.get(type) ?? 0) >= n);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const card = (id: string) => {
    const info = TECHNOLOGIES[id];
    const researched = seat.technologies.includes(id);
    const color = TECH_TYPES.find((t) => t.type === info.type)?.color ?? 'var(--muted)';
    return (
      <div
        key={id}
        className={`tech-card ${researched ? 'researched' : meets(info.requirements) ? 'available' : 'locked'}`}
        style={{ borderTopColor: color }}
      >
        <div className="tech-card-head">
          <strong>{info.name}</strong>
          <span className="requirements" title={info.requirements ? `Requires ${describeRequirements(info.requirements)}` : 'No prerequisites'}>
            {[...info.requirements].map((letter, i) => (
              <span
                key={i}
                className="req-dot"
                style={{ background: TECH_TYPES.find((t) => t.type === LETTER_TYPE[letter])?.color }}
              />
            ))}
          </span>
        </div>
        <p className="tech-card-text">{info.text}</p>
        <div className="tech-card-foot">
          {researched ? (
            <span className="muted">Researched</span>
          ) : (
            <button onClick={() => dispatch({ type: 'tech/research', player: me, tech: id })}>Research</button>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="tech-browser" role="dialog" aria-label="Research a technology" onClick={(e) => e.stopPropagation()}>
        <header className="tech-browser-header">
          <div>
            <h2>Research a technology</h2>
            <p className="hint">
              Highlighted cards have their prerequisites met by the technologies you own (
              {TECH_TYPES.filter((t) => t.type !== 'unit')
                .map((t) => `${owned.get(t.type) ?? 0} ${t.label.toLowerCase()}`)
                .join(', ')}
              ). Prerequisites aren't enforced.
            </p>
          </div>
          <button className="close" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </header>
        <div className="tech-browser-body">
          <div className="tech-columns">
            {TECH_TYPES.map(({ type, label, color }) => {
              const ids = generic
                .filter((id) => TECHNOLOGIES[id].type === type)
                .sort((a, b) => TECHNOLOGIES[a].requirements.length - TECHNOLOGIES[b].requirements.length);
              return (
                <div key={type} className="tech-column">
                  <h3 style={{ color }}>{label}</h3>
                  {ids.map(card)}
                </div>
              );
            })}
          </div>
          <h3 className="faction-techs-title">
            Faction technologies{seat.faction ? ` · ${FACTIONS[seat.faction]?.name}` : ''}
          </h3>
          {faction.length ? (
            <div className="tech-faction-row">{faction.map(card)}</div>
          ) : (
            <p className="hint">
              {seat.faction ? 'This faction has no technologies of its own.' : 'Pick your faction to see its technologies.'}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
