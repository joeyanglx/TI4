# TI4 Table

A free-form, browser-based Twilight Imperium 4th Edition table for playing with friends. Like Tabletop Simulator, but only for TI4: there are no rules enforced, you just move pieces around a shared board.

## Getting started

Requires Node 22+.

```sh
npm install
npm run dev
```

Open http://localhost:5173, enter a name and a room. Anyone who joins the same room shares the board. Friends on the same network can use the "Network" URL Vite prints.

## Using the table

- **Game version** (top bar): Base, PoK or PoK + TE, for everyone at the table. It decides the card decks (action cards, objectives, agendas, relics, strategy cards) and which factions, technologies, promissory notes, systems and units are offered. Switching rebuilds the decks, so once cards are in play it asks first.
- **Pieces tab**: pick your colour, drag units and tokens onto the board. Units stack: drop a unit on a matching one (same unit, same colour), from the palette or the map, and it joins the stack with a count badge. Right-click a piece for a menu: add or remove one, split one off, sustain damage / repair (a red dashed ring, with a red badge counting damaged units in a stack), or remove it.
- **Systems tab**: *Load balanced map* puts down a ready-made map in one click (saved from game-2; presets live in `shared/src/presets.ts`). Search or filter the system tiles and drag them onto a hex. Paste a map string (TTS / map generator format, e.g. `{18} 26 41 ... 84A3`) under *Map string* to load a whole map, or use *Show current* to copy yours out.
- **Edit map mode** (top bar): drag tiles to move or swap them, double-click to rotate (for hyperlanes), right-click to remove. Pieces are dimmed and locked while editing.
- Hover any system to see its planets, resources/influence, traits, anomalies and wormholes. Right-click a system for *Show units in this system*: every player's units there, by space and planet, with real unit names and damage. Right-click a planet to *Take control* of it (or *Give up control*); its planet card goes to you exhausted, as when gaining control from the player board.
- **Right panel**, tabbed like the left sidebar. **Player board** tab, **Game** view: strategy cards (pick, use/ready, trade goods), public objectives (reveal stage I/II, score), agendas (reveal, enact or discard, elect, repeal laws, look at the top two for Politics), relics (gain, exhaust, give, purge), everyone's planets, the action discard pile, and a scoreboard (VP, cards in hand, trade goods, commodities). Picking a strategy card gives you the trade goods on it.
- **Player board** tab, **You** view: your faction (pick it at the start of the game: its icon shows next to your name everywhere, and its starting technologies are added for you; factions that choose their starting techs get buttons for the options), your trade goods and commodities (set your faction's commodity limit, replenish, convert, give; commodities you give arrive as trade goods), your hand of action cards and secret objectives (draw, play, give, score), your promissory notes (your own generic and faction notes plus ones given to you: give any of them to another player, play them into your play area, return them to their owner; Support for the Throne and Alliance go straight into the receiver's play area, and Support for the Throne adds 1 VP there), your planet cards (gain control of planets on the map, exhaust/ready, ready all, give away), your command tokens (tactic, fleet and strategy pools, drawn like the overview; reinforcements are what's left of 16 after your sheet and the command tokens on the board in your colour), and your technologies (*Research a technology…* opens a panel with every technology laid out by colour, with prerequisites and card text, plus your faction's own technologies once you've picked one; cards whose prerequisites you meet are highlighted; exhaust/ready researched ones). Hover a system to see who controls its planets.
- **Overview** tab: every player at a glance, like Twilight Wars' info panel: speaker token, VP, command tokens, trade goods, commodities, cards and promissory notes in hand, play area, relics, strategy cards, technologies by colour, and planets with ready resources/influence.
  - Click the **i** next to a player's faction for its faction sheet: abilities, faction technologies, flagship, promissory note and every unit's stats (with upgrades).
  - The overview is display only. Tokens are moved in the **Command tokens** section of your own player board: drag a command token from a pool (tactic, fleet, strategy or reinforcements) onto the map to place it in your colour, or onto another pool to redistribute; drag a command token on the map back onto a pool to pick it up (onto reinforcements to just remove it).
  - The speaker token shows in that section while you hold it (or nobody does): drag it onto the map, drag it off the map onto your section to take it, or use *Give speaker to…*.
- **Battles**: right-click a system for *Space combat* between two players with ships there. Ground combat is per planet: drag ground forces onto a planet (hover a tile to see its planet circles; anything outside a circle is in space), then right-click that planet for *Ground combat on <planet>*. Only units on that planet fight; ships in the system can support with bombardment, and only that planet's PDS fire space cannon defense. A popup opens for everyone at the table, with each side's units (their faction's units, upgraded where researched; Jol-Nar's Fragile and Sardakk's Unrelenting are built into the hit values). Each side rolls once per roll type per round (combat, plus anti-fighter barrage / space cannon in space, bombardment / space cannon on the ground), and can re-roll misses. Each unit type has its own modifier for the selected roll type (the *Mod* column, e.g. +1 for dreadnoughts only); the *Hits on* column shows the result, and a modifier set for combat doesn't carry over to bombardment or space cannon. Hits scored by one side are assigned by the other: *Sustain* or *Destroy* (damaged units go first), or *Skip* to leave the rest unassigned (cancelled by an ability, no valid target). Damaged units have a *Repair* button for mid-battle repairs like Duranium Armor. *Undo* puts that side back to the start of the round: hits, skips and repairs. *Next round* once all hits are assigned; *End battle & apply* writes the losses and damage back to the stacks on the map, *Cancel battle* changes nothing. Dice are rolled in the roller's browser, so this runs on trust like hidden hands.
- **Space cannon offense**: a player with no ships in a system can still fire at ships there with SPACE CANNON — units in the system, plus deep-space units (e.g. PDS II) in adjacent systems. The system's right-click menu lists it as *Space cannon offense: red fires at blue*, which opens the same battle popup with the firing player as attacker: they roll space cannon once (with a modifier per unit type, re-rolling misses if allowed), the target assigns the hits, then *End battle & apply*. There are no combat rounds and the target doesn't roll. In a normal space combat, a side's space cannon roll includes its adjacent deep-space units too. Adjacency is by touching hexes; wormholes aren't followed.
- **History** tab: a shared log of everything anyone does, newest first, in plain English (it never names a card someone drew in secret). Consecutive moves by one player collapse into one line. *Rewind to here* (with a confirmation) puts the whole table, cards and hands included, back to just after that entry for everyone; the rewind is logged too, so it can be undone by rewinding again.
- Drag empty space to pan, scroll to zoom.

## Hosting a game

```sh
npm run build   # build the client into client/dist
npm start       # serves the client and the websocket on port 3001 (set PORT to change)
```

Rooms are saved to `server/data/<room>.json`, with their history in `<room>.history.json`, and restored when the server restarts.

### Playing over the internet

Friends on the same Wi-Fi can just use `http://<your-LAN-IP>:3001`. For friends elsewhere, put a temporary tunnel in front of the production server. Cloudflare's quick tunnel needs no account:

```sh
brew install cloudflared
npm run build && npm start
cloudflared tunnel --url http://localhost:3001   # prints a https://….trycloudflare.com link to share
```

Stop the tunnel (Ctrl+C) after the game. There's no login yet: anyone with the link can join any room and change the board. Tunnel the production server (3001) rather than the Vite dev server: it's faster, won't hot-reload mid-game, and Vite rejects unknown hostnames by default.

## Project layout

| Package | What it is |
|---|---|
| `shared/` | Game model used by both sides: hex math, piece types, `GameState`, `applyAction`, and the websocket message types |
| `server/` | Node + `ws` server. Keeps each room's state, relays actions to other players, saves rooms to disk |
| `client/` | Vite + React + `react-konva` board: pan/zoom hex map, system tiles, draggable pieces, sidebar palettes |

## Tile data and images

`shared/src/data/systems.json` and `client/public/tiles/` come from the [KeeganW/ti4](https://github.com/KeeganW/ti4) map generator (planet positions and circles from [AsyncTI4](https://github.com/AsyncTI4/TI4_map_generator_bot)'s tile layouts; Mecatol Rex and Mallice measured on these images), filtered to official tiles: base game (1–50), Prophecy of Kings (51–91, including hyperlanes 83A–91B) and Thunder's Edge (92–118). For private use with friends.

`shared/src/data/cards.json` (action cards, objectives, agendas, relics, strategy cards, technologies, factions with their abilities, promissory notes and units) comes from the [AsyncTI4 bot](https://github.com/AsyncTI4/TI4_map_generator_bot), official cards only. Each edition's decks follow AsyncTI4's deck lists: base game (80 action cards, base objectives and agendas, no relics, base Construction), PoK (120 action cards, PoK objectives and agendas, 16 relics) and PoK + Thunder's Edge (140 action cards, 23 relics, Thunder's Edge Construction and Warfare). Regenerate it with `node scripts/import-cards.mjs <bot>/src/main/resources/data`. Faction icons in `client/public/factions/` come from the same repo: `python scripts/import-faction-icons.py <bot>/src/main/resources/emojis/factions` (needs Pillow).

## How syncing works

Every change to the board is an `Action` (see `shared/src/state.ts`). The client applies it locally straight away so dragging feels instant, then sends it to the server. The server applies the same `applyAction` and forwards it to everyone else in the room. When someone joins, they get a full snapshot.

To add a new kind of change (e.g. flipping a card), add an `Action` variant and handle it in `applyAction`. Both sides pick it up automatically.

## Scripts

- `npm run dev` — server and client together, with hot reload
- `npm run typecheck` — type-check all packages
- `npm run build` — production build of the client
- `npm start` — run the server (serves the built client too)
