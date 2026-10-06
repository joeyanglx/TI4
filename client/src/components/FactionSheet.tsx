import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FACTIONS,
  TECHNOLOGIES,
  UNITS,
  factionTechnologies,
  inEdition,
  type DiceRoll,
  type Edition,
  type UnitInfo,
} from '@ti4/shared';
import { TECH_TYPES, describeRequirements, techColor } from '../techs';
import { FactionIcon } from './cardParts';

interface Props {
  faction: string;
  edition: Edition;
  onClose: () => void;
}

/** Floating faction sheet: abilities, faction technologies, flagship, promissory note and unit stats. */
export function FactionSheet({ faction, edition, onClose }: Props) {
  const info = FACTIONS[faction];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!info) return null;
  // Mechs (PoK) and other expansion units don't exist in a base game.
  const units = info.units.map((id) => UNITS[id]).filter((u) => u && inEdition(u.expansion, edition));
  const flagship = units.find((u) => u.type === 'flagship');
  const techs = factionTechnologies(edition, faction);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="faction-sheet" role="dialog" aria-label={info.name} onClick={(e) => e.stopPropagation()}>
        <header className="tech-browser-header">
          <div className="faction-sheet-title">
            <FactionIcon faction={faction} size={44} />
            <div>
              <h2>{info.name}</h2>
              <p className="hint">Commodities {info.commodities}</p>
            </div>
          </div>
          <button className="close" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </header>
        <div className="tech-browser-body faction-sheet-body">
          <section>
            <h3>Faction abilities</h3>
            {info.abilities.map((a) => (
              <div key={a.name} className="sheet-entry">
                <strong>{a.name}</strong>
                <p>{a.text}</p>
              </div>
            ))}
          </section>

          <section>
            <h3>Faction technologies</h3>
            {techs.length === 0 && <p className="hint">None.</p>}
            <div className="sheet-cards">
              {techs.map((id) => {
                const tech = TECHNOLOGIES[id];
                return (
                  <div key={id} className="tech-card" style={{ borderTopColor: techColor(id) }}>
                    <div className="tech-card-head">
                      <strong>{tech.name}</strong>
                      <span className="requirements" title={tech.requirements ? `Requires ${describeRequirements(tech.requirements)}` : 'No prerequisites'}>
                        {[...tech.requirements].map((letter, i) => (
                          <span key={i} className="req-dot" style={{ background: requirementColor(letter) }} />
                        ))}
                      </span>
                    </div>
                    <p className="tech-card-text">{tech.text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {flagship && (
            <section>
              <h3>Flagship</h3>
              <div className="sheet-entry">
                <strong>{flagship.name}</strong> <span className="muted">{statLine(flagship)}</span>
                {flagship.ability && <p>{flagship.ability}</p>}
              </div>
            </section>
          )}

          <section>
            <h3>Promissory note</h3>
            {info.promissoryNotes.map((note) => (
              <div key={note.name} className="sheet-entry">
                <strong>{note.name}</strong>
                <p>{note.text}</p>
              </div>
            ))}
          </section>

          <section>
            <h3>Units</h3>
            <table className="unit-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th title="Cost">Cost</th>
                  <th title="Combat: hits on (dice)">Combat</th>
                  <th title="Move">Move</th>
                  <th title="Capacity">Cap.</th>
                  <th>Abilities</th>
                </tr>
              </thead>
              <tbody>
                {units.flatMap((unit) => {
                  const upgrade = unit.upgrade ? UNITS[unit.upgrade] : undefined;
                  return [unit, upgrade].filter((u): u is UnitInfo => !!u).map((u, i) => (
                    <tr key={u.name} className={i ? 'upgrade' : ''}>
                      <td>
                        <strong>{u.name}</strong>
                        {u.ability && <div className="unit-ability">{u.ability}</div>}
                      </td>
                      <td>{formatCost(u.cost)}</td>
                      <td>{formatRoll(u.combat)}</td>
                      <td>{u.move ?? '–'}</td>
                      <td>{u.capacity ?? '–'}</td>
                      <td className="unit-keywords">{keywords(u).join(', ') || '–'}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function requirementColor(letter: string) {
  const type = { G: 'biotic', Y: 'cybernetic', B: 'propulsion', R: 'warfare' }[letter];
  return TECH_TYPES.find((t) => t.type === type)?.color;
}

/** "5 (x2)" = hits on 5 or more, rolling 2 dice. */
function formatRoll(roll?: DiceRoll) {
  if (!roll) return '–';
  return roll.dice > 1 ? `${roll.hitsOn} (x${roll.dice})` : String(roll.hitsOn);
}

/** Fighters and infantry cost 1 for 2. */
function formatCost(cost?: number) {
  if (cost === undefined) return '–';
  return cost === 0.5 ? '1 (x2)' : String(cost);
}

function keywords(unit: UnitInfo): string[] {
  return [
    unit.sustainDamage && 'Sustain Damage',
    unit.bombardment && `Bombardment ${formatRoll(unit.bombardment)}`,
    unit.antiFighterBarrage && `Anti-Fighter Barrage ${formatRoll(unit.antiFighterBarrage)}`,
    unit.spaceCannon && `${unit.spaceCannon.deepSpace ? 'Deep Space Cannon' : 'Space Cannon'} ${formatRoll(unit.spaceCannon)}`,
    unit.planetaryShield && 'Planetary Shield',
    unit.production && `Production ${unit.production}`,
  ].filter((k): k is string => !!k);
}

function statLine(unit: UnitInfo) {
  return [
    `Cost ${formatCost(unit.cost)}`,
    `Combat ${formatRoll(unit.combat)}`,
    `Move ${unit.move ?? '–'}`,
    `Capacity ${unit.capacity ?? '–'}`,
    ...keywords(unit),
  ].join(' · ');
}
