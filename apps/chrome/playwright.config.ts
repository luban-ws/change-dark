import { defineConfig } from '@playwright/test';

/** 极简构建版隔离配置：确保绝不与系统 Google Chrome 产生任何物理或逻辑联系 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  fullyParallel: false, // 保持单线程
  workers: 1,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    // 强制 Playwright 只使用它自带下载的 Chromium 二进制文件
  },
  projects: [
    {
      name: 'isolated-chromium',
    },
  ],
});
