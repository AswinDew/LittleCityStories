import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['foundation.spec.ts', 'assets.spec.ts', 'construction.spec.ts'],
  outputDir: 'test-results/development',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: 'http://127.0.0.1:3100', viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 3100 --strictPort --mode test',
    url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 30000 },
});
