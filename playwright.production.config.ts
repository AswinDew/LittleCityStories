import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'production.spec.ts',
  outputDir: 'test-results/production',
  workers: 1,
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: 'http://127.0.0.1:3101',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 3101 --strictPort',
    url: 'http://127.0.0.1:3101', reuseExistingServer: false, timeout: 30000,
  },
});
