# TI4 Table

A free-form, browser-based Twilight Imperium 4th Edition table for playing with friends. Like Tabletop Simulator, but only for TI4: there are no rules enforced, you just move pieces around a shared board.

## Getting started

Requires Node 22+.

```sh
npm install
npm run dev
```

Open http://localhost:5173, enter a name and a room. Anyone who joins the same room shares the board. Friends on the same network can use the "Network" URL Vite prints.

## Hosting a game

```sh
npm run build   # build the client into client/dist
npm start       # serves the client and the websocket on port 3001 (set PORT to change)
```

Rooms are saved to `server/data/<room>.json` and restored when the server restarts.

## Project layout

| Package | What it is |
|---|---|
| `shared/` | Game model used by both sides: hex math, piece types, `GameState`, `applyAction`, and the websocket message types |
| `server/` | Node + `ws` server. Keeps each room's state, relays actions to other players, saves rooms to disk |
| `client/` | Vite + React + `react-konva` board: pan/zoom hex map, draggable pieces, palette |

## How syncing works

Every change to the board is an `Action` (see `shared/src/state.ts`). The client applies it locally straight away so dragging feels instant, then sends it to the server. The server applies the same `applyAction` and forwards it to everyone else in the room. When someone joins, they get a full snapshot.

To add a new kind of change (e.g. flipping a card), add an `Action` variant and handle it in `applyAction`. Both sides pick it up automatically.

## Scripts

- `npm run dev` — server and client together, with hot reload
- `npm run typecheck` — type-check all packages
- `npm run build` — production build of the client
- `npm start` — run the server (serves the built client too)
