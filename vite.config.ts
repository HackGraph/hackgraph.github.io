import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// hackgraph.github.io is an org/user pages site -> served at the domain root.
export default defineConfig({
  base: '/',
  // Expose the dev server on the LAN/tailnet by default (no `--host` flag needed).
  server: { host: true },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split the heavy graph/animation libs into cacheable vendor chunks.
        manualChunks: {
          reactflow: ['@xyflow/react'],
          motion: ['framer-motion'],
          dagre: ['@dagrejs/dagre'],
        },
      },
    },
  },
});
