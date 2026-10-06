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
  ['base_game.json', 'pok.json', 'thundersedge.json'].flatMap((f) => read(`decks/${f}`)).map((d) => [d.alias, d.cardIDs]),
);

// AsyncTI4 tags half of PoK's action cards as "codex1", and some relics as later Codices; all are in a PoK game.
const EXPANSION = { base: 'base', pok: 'pok', codex1: 'pok', codex2: 'pok', codex4: 'pok', thunders_edge: 'te' };
const expansion = (source) => {
  const e = EXPANSION[source];
  if (!e) throw new Error(`Unknown card source: ${source}`);
  return e;
};

// Agenda and relic aliases can clash with action cards (e.g. "crisis"), so they get a prefix.
const AGENDA = 'agenda_';
const RELIC = 'relic_';

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

const agendaSource = byAlias([...read('agendas/base.json'), ...read('agendas/pok.json')]);
const agendas = {};
for (const id of new Set([...decks.agendas_base_game, ...decks.agendas_pok])) {
  const a = agendaSource[id];
  agendas[AGENDA + id] = {
    name: a.name,
    expansion: expansion(a.source),
    type: a.type.toLowerCase(),
    target: a.target,
    for: a.text1,
    against: a.text2 || undefined,
  };
}

const relicSource = byAlias([...read('relics/pok.json'), ...read('relics/codexii.json'), ...read('relics/codexiv.json'), ...read('relics/te_relics.json')]);
const relics = {};
for (const id of decks.relics_pok_te) {
  const r = relicSource[id];
  relics[RELIC + id] = { name: r.name, expansion: expansion(r.source), text: r.text };
}

const strategySource = Object.fromEntries(
  ['pok', 'te', 'obsolete'].flatMap((f) => read(`strategy_cards/${f}.json`)).map((s) => [s.id, s]),
);
// Base game: the Codex I Diplomacy (official errata for every edition) and base Construction.
const STRATEGY_SETS = {
  base: ['pok1leadership', 'pok2diplomacy', 'pok3politics', 'base4', 'pok5trade', 'pok6warfare', 'pok7technology', 'pok8imperial'],
  pok: ['pok1leadership', 'pok2diplomacy', 'pok3politics', 'pok4construction', 'pok5trade', 'pok6warfare', 'pok7technology', 'pok8imperial'],
  te: ['pok1leadership', 'pok2diplomacy', 'pok3politics', 'te4construction', 'pok5trade', 'te6warfare', 'pok7technology', 'pok8imperial'],
};
const strategyCards = {};
for (const id of new Set(Object.values(STRATEGY_SETS).flat())) {
  const s = strategySource[id];
  strategyCards[id] = {
    name: s.name,
    initiative: s.initiative,
    expansion: expansion(s.source),
    // Retired cards like the base game's Construction have no colour; borrow the PoK card's.
    color: s.colourHexCode ?? strategySource[STRATEGY_SETS.pok[s.initiative - 1]].colourHexCode,
    primary: s.primaryTexts.map((t) => t.replaceAll('\n', ' ')),
    secondary: s.secondaryTexts,
  };
}

const editions = {
  base: {
    action: decks.action_cards_basegame,
    secret: decks.secret_objectives_base,
    stage1: decks.public_stage_1_objectives_base,
    stage2: decks.public_stage_2_objectives_base,
    agenda: decks.agendas_base_game.map((id) => AGENDA + id),
    relic: [],
    strategy: STRATEGY_SETS.base,
  },
  pok: {
    action: decks.action_cards_pok,
    secret: decks.secret_objectives_pok,
    stage1: decks.public_stage_1_objectives_pok,
    stage2: decks.public_stage_2_objectives_pok,
    agenda: decks.agendas_pok.map((id) => AGENDA + id),
    relic: decks.relics_pok.map((id) => RELIC + id),
    strategy: STRATEGY_SETS.pok,
  },
  te: {
    action: decks.action_cards_te,
    secret: decks.secret_objectives_pok,
    stage1: decks.public_stage_1_objectives_pok,
    stage2: decks.public_stage_2_objectives_pok,
    agenda: decks.agendas_pok.map((id) => AGENDA + id),
    relic: decks.relics_pok_te.map((id) => RELIC + id),
    strategy: STRATEGY_SETS.te,
  },
};

const out = path.resolve(import.meta.dirname, '../shared/src/data/cards.json');
writeFileSync(out, JSON.stringify({ actionCards, objectives, agendas, relics, strategyCards, editions }, null, 1) + '\n');
for (const [name, e] of Object.entries(editions)) {
  console.log(name, Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v.length])));
}
