import { defineConfig } from 'vitest/config';

// Standalone test config. Kept separate from vite.config.ts because vitest
// bundles its own copy of vite, whose plugin types clash with the app's vite
// plugins. The graph-logic tests are pure TypeScript and need no plugins.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
