# TI4 Table

Browser sandbox for Twilight Imperium 4th Edition, for a private group of friends. No rules enforcement: players move tiles and pieces freely on a shared, real-time board. See README.md for usage.

## Commands

- `npm run dev` — server (:3001, tsx watch) + Vite client (:5173, proxies `/ws` to the server)
- `npm run typecheck` — run after every change; there are no tests yet
- `npm run build` / `npm start` — production: the server also serves `client/dist`

## Architecture

npm workspaces, all TypeScript (ESM, strict):

- `shared/` — imported as `@ti4/shared` straight from source (no build step). Hex math (axial, flat-top), piece kinds, `GameState`, `Action`, `applyAction`, websocket protocol, map-string parsing, system data.
- `server/` — plain Node `http` + `ws`. One `Room` per room id, in memory, debounced save to `server/data/<room>.json` (gitignored).
- `client/` — React 19 + react-konva. `useGame` owns the socket and local state; `Board` renders tiles/pieces; `Sidebar` holds the piece and system palettes.

## Conventions

- **Every board change is an `Action`** handled in `applyAction` (`shared/src/state.ts`), which must stay pure. The client applies actions optimistically, the server applies the same function and relays to the other clients. Never mutate state outside it.
- New features usually mean: add an `Action` variant → handle it in `applyAction` → dispatch it from the UI. The server needs no change.
- Board coordinates are in "board pixels" (`HEX_SIZE` = 100, hex centre to corner). Tiles are keyed by `hexKey(q, r)`; pieces have free x/y.
- Map strings follow the TTS / map generator format: ring by ring, starting from the top hex and going clockwise (`hexRing`).
- System data (`shared/src/data/systems.json`) and tile images (`client/public/tiles/ST_<id>.webp`) were generated from the KeeganW/ti4 repo, official tiles only (base, PoK, Thunder's Edge). Don't hand-edit the JSON in bulk; regenerate it.
- `crypto.randomUUID` is unavailable over plain http on a LAN IP — use `newId()` in `client/src/id.ts`.
- Pieces are placeholder circles with labels (`PIECE_STYLE`); real unit art hasn't been added yet.
- Style: 2-space indent, single quotes, small focused components, comments only where the "why" isn't obvious.

## Ideas not yet built

Unit stacking (e.g. "3× fighter"), player areas (planet cards, tech, command sheet), private hands, undo, auth for public hosting.
