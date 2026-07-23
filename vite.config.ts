import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Stamp the build with the git commit + date so the UI can show "how current is
// this?" and report-issue links are reproducible. Self-updating (no hand-bumped
// version); falls back gracefully when git isn't available (e.g. a tarball build).
function buildInfo() {
  try {
    const run = (cmd: string) =>
      execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return { hash: run('git rev-parse --short HEAD'), date: run('git log -1 --format=%cI') };
  } catch {
    return { hash: 'dev', date: new Date().toISOString() };
  }
}
const build = buildInfo();

// hackgraph.github.io is an org/user pages site -> served at the domain root.
export default defineConfig({
  base: '/',
  // Expose the dev server on the LAN/tailnet by default (no `--host` flag needed).
  server: { host: true },
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_HASH__: JSON.stringify(build.hash),
    __BUILD_DATE__: JSON.stringify(build.date),
  },
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
