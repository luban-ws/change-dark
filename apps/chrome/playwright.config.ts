import { defineConfig } from '@playwright/test';

const FIXTURE_PORT = Number(process.env.E2E_FIXTURE_PORT ?? 4173);

/** 极简构建版隔离配置：确保绝不与系统 Google Chrome 产生任何物理或逻辑联系 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `node e2e/serve-fixtures.mjs`,
    port: FIXTURE_PORT,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'isolated-chromium',
    },
  ],
});
