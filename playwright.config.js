import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 20000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: [{ command: 'node tools/serve.mjs', url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI, gracefulShutdown: { signal: 'SIGTERM', timeout: 3000 } },
    { command: 'node tools/serve-stage.mjs', url: 'http://127.0.0.1:5183',
      reuseExistingServer: false, gracefulShutdown: { signal: 'SIGTERM', timeout: 3000 } }],
});
