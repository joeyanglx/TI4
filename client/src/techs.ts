import { TECHNOLOGIES, type TechType } from '@ti4/shared';

/** Technology colours as printed on the cards. */
export const TECH_TYPES: { type: TechType; label: string; color: string }[] = [
  { type: 'biotic', label: 'Biotic', color: '#3aa655' },
  { type: 'cybernetic', label: 'Cybernetic', color: '#e0c12e' },
  { type: 'propulsion', label: 'Propulsion', color: '#3a6fd3' },
  { type: 'warfare', label: 'Warfare', color: '#d33a3a' },
  { type: 'unit', label: 'Unit upgrades', color: '#e8e8e8' },
];

const REQUIREMENT_NAMES: Record<string, string> = { G: 'biotic', Y: 'cybernetic', B: 'propulsion', R: 'warfare' };

export function techColor(id: string): string {
  return TECH_TYPES.find((t) => t.type === TECHNOLOGIES[id]?.type)?.color ?? '#8a93ad';
}

/** "GGY" -> "2 biotic, 1 cybernetic" */
export function describeRequirements(requirements: string): string {
  const counts = new Map<string, number>();
  for (const letter of requirements) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  return [...counts].map(([letter, n]) => `${n} ${REQUIREMENT_NAMES[letter] ?? letter}`).join(', ');
}

/** Card text for a tooltip. */
export function techTooltip(id: string): string {
  const info = TECHNOLOGIES[id];
  const needs = info.requirements ? `Requires ${describeRequirements(info.requirements)}\n` : '';
  return `${info.name}${info.faction ? ` (${info.faction})` : ''}\n${needs}${info.text}`;
}
