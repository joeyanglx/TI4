// Regenerates shared/src/data/cards.json from the AsyncTI4 bot's card data (official cards only).
//
//   git clone --depth 1 https://github.com/AsyncTI4/TI4_map_generator_bot.git
//   node scripts/import-cards.mjs TI4_map_generator_bot/src/main/resources/data
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Usage: node scripts/import-cards.mjs <AsyncTI4 resources/data dir>');
  process.exit(1);
}

const read = (file) => JSON.parse(readFileSync(path.join(dataDir, file), 'utf8'));
const byAlias = (list) => Object.fromEntries(list.map((x) => [x.alias, x]));
const decks = Object.fromEntries(
  ['pok.json', 'thundersedge.json'].flatMap((f) => read(`decks/${f}`)).map((d) => [d.alias, d.cardIDs]),
);

// AsyncTI4 tags half of PoK's action cards as "codex1"; they ship in the PoK box.
const EXPANSION = { base: 'base', pok: 'pok', codex1: 'pok', thunders_edge: 'te' };
const expansion = (source) => {
  const e = EXPANSION[source];
  if (!e) throw new Error(`Unknown card source: ${source}`);
  return e;
};

const actionSource = byAlias([
  ...read('action_cards/action_cards.json'),
  ...read('action_cards/te_actioncards.json'),
]);
const actionCards = {};
for (const id of decks.action_cards_te) {
  const c = actionSource[id];
  actionCards[id] = { name: c.name, expansion: expansion(c.source), phase: c.phase, window: c.window, text: c.text };
}

const publicSource = byAlias(read('public_objectives/public_objectives.json'));
const secretSource = byAlias(read('secret_objectives/secret_objectives.json'));
const objectives = {};
const addObjectives = (ids, source, type) => {
  for (const id of ids) {
    const o = source[id];
    objectives[id] = { name: o.name, type, expansion: expansion(o.source), phase: o.phase, points: o.points, text: o.text };
  }
};
addObjectives(decks.public_stage_1_objectives_pok, publicSource, 'stage1');
addObjectives(decks.public_stage_2_objectives_pok, publicSource, 'stage2');
addObjectives(decks.secret_objectives_pok, secretSource, 'secret');

const strategyCards = {};
for (const s of [...read('strategy_cards/pok.json'), ...read('strategy_cards/te.json')]) {
  strategyCards[s.id] = {
    name: s.name,
    initiative: s.initiative,
    expansion: expansion(s.source),
    color: s.colourHexCode,
    primary: s.primaryTexts,
    secondary: s.secondaryTexts,
  };
}

const out = path.resolve(import.meta.dirname, '../shared/src/data/cards.json');
writeFileSync(out, JSON.stringify({ actionCards, objectives, strategyCards }, null, 1) + '\n');
console.log(
  `Wrote ${Object.keys(actionCards).length} action cards, ${Object.keys(objectives).length} objectives, ` +
    `${Object.keys(strategyCards).length} strategy cards to ${out}`,
);
