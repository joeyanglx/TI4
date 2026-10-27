import path from 'node:path';
import { defaultClientConditions, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gameAssets } from '@joeyanglx/ahob-client/vite';

// The table server (PORT, as for npm start).
const SERVER_PORT = process.env.PORT ?? 3001;

// The game's packages are read from source, so edits show up without a build.
export default defineConfig({
  plugins: [react(), gameAssets({ ti4: path.resolve(import.meta.dirname, '../client/assets') })],
  publicDir: false,
  resolve: { conditions: ['ahob-source', ...defaultClientConditions], dedupe: ['react', 'react-dom'] },
  server: {
    // Listen on the LAN so friends on the same network can join during development.
    host: true,
    proxy: {
      '/ws': { target: `ws://localhost:${SERVER_PORT}`, ws: true },
      '/api': `http://localhost:${SERVER_PORT}`,
    },
  },
});
