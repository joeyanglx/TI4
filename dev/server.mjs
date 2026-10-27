// The TI4 table on its own, for development: the platform server with only this game.
// Rooms are saved in dev/data/ti4/.
import path from 'node:path';
import { startServer } from '@joeyanglx/ahob-server';
import { ti4Rules } from '@joeyanglx/ti4-rules';

startServer({
  games: [ti4Rules],
  clientDir: process.env.AHOB_CLIENT_DIR ?? path.join(import.meta.dirname, 'dist'),
  dataDir: process.env.AHOB_DATA_DIR ?? path.join(import.meta.dirname, 'data'),
});
