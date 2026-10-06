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

- **Pieces tab**: pick your colour, drag units and tokens onto the board. Right-click a piece to remove it.
- **Systems tab**: search or filter the system tiles and drag them onto a hex. Paste a map string (TTS / map generator format, e.g. `{18} 26 41 ... 84A3`) under *Map string* to load a whole map, or use *Show current* to copy yours out.
- **Edit map mode** (top bar): drag tiles to move or swap them, double-click to rotate (for hyperlanes), right-click to remove. Pieces are dimmed and locked while editing.
- Hover any system to see its planets, resources/influence, traits, anomalies and wormholes.
- **Cards panel** (top bar, right), **Game** tab: strategy cards (pick, use/ready, trade goods), public objectives (reveal stage I/II, score), agendas (reveal, enact or discard, elect, repeal laws, look at the top two for Politics), relics (gain, exhaust, give, purge), everyone's planets, the action discard pile, and a scoreboard (VP, cards in hand, trade goods, commodities). Picking a strategy card gives you the trade goods on it.
- **You** tab: your trade goods and commodities (set your faction's commodity limit, replenish, convert, give; commodities you give arrive as trade goods), your hand of action cards and secret objectives (draw, play, give, score), your planet cards (gain control of planets on the map, exhaust/ready, ready all, give away), your command tokens (tactic, fleet and strategy pools; reinforcements are what's left of 16 after your sheet and the command tokens on the board in your colour), and your technologies (research any generic or faction tech, exhaust/ready). Hover a system to see who controls its planets.
- **i** button (top right): an overview of every player, like Twilight Wars' info panel: VP, command tokens, trade goods, commodities, cards in hand, relics, strategy cards, technologies by colour, and planets with ready resources/influence. Click a card's name to read it. *Card setup* (bottom of the panel) starts the cards over for the base game only, Prophecy of Kings, or PoK + Thunder's Edge. Other players only see how many cards you hold, but hands aren't secret from anyone reading the network traffic.
- Drag empty space to pan, scroll to zoom.

## Hosting a game

```sh
npm run build   # build the client into client/dist
npm start       # serves the client and the websocket on port 3001 (set PORT to change)
```

Rooms are saved to `server/data/<room>.json` and restored when the server restarts.

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

`shared/src/data/systems.json` and `client/public/tiles/` come from the [KeeganW/ti4](https://github.com/KeeganW/ti4) map generator, filtered to official tiles: base game (1–50), Prophecy of Kings (51–91, including hyperlanes 83A–91B) and Thunder's Edge (92–118). For private use with friends.

`shared/src/data/cards.json` (action cards, objectives, agendas, relics, strategy cards, technologies) comes from the [AsyncTI4 bot](https://github.com/AsyncTI4/TI4_map_generator_bot), official cards only. Each edition's decks follow AsyncTI4's deck lists: base game (80 action cards, base objectives and agendas, no relics, base Construction), PoK (120 action cards, PoK objectives and agendas, 16 relics) and PoK + Thunder's Edge (140 action cards, 23 relics, Thunder's Edge Construction and Warfare). Regenerate it with `node scripts/import-cards.mjs <bot>/src/main/resources/data`.

## How syncing works

Every change to the board is an `Action` (see `shared/src/state.ts`). The client applies it locally straight away so dragging feels instant, then sends it to the server. The server applies the same `applyAction` and forwards it to everyone else in the room. When someone joins, they get a full snapshot.

To add a new kind of change (e.g. flipping a card), add an `Action` variant and handle it in `applyAction`. Both sides pick it up automatically.

## Scripts

- `npm run dev` — server and client together, with hot reload
- `npm run typecheck` — type-check all packages
- `npm run build` — production build of the client
- `npm start` — run the server (serves the built client too)
