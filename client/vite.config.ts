import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on the LAN so friends on the same network can join during development.
    host: true,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
});
