import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    const extensionPath = path.resolve(__dirname, '../dist');
    
    // Create a truly unique and temporary directory in the system temp folder
    // This ensures NO overlap with existing Chrome profiles or project data.
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-chrome-ext-'));
    console.log(`[E2E] Loading extension from: ${extensionPath}`);
    console.log(`[E2E] Using isolated temp profile: ${userDataDir}`);

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: process.env.HEADLESS !== 'false',
      args: [
        process.env.HEADLESS !== 'false' ? '--headless=new' : '', // MV3 headless support
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ].filter(Boolean),
    });
    
    // VERIFICATION: Log exactly which browser binary is being used
    console.log(`[E2E] Internal Chromium Path: ${chromium.executablePath()}`);

    await use(context);
    
    // Clean up
    await context.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`[E2E] Failed to cleanup temp profile: ${userDataDir}`);
    }
  },
  extensionId: async ({ context }, use) => {
    // MV3 worker discovery
    let worker = context.serviceWorkers()[0];
    if (!worker) {
      // Dummy navigation to wake up dormant service worker
      const dummy = await context.newPage();
      await dummy.goto('about:blank');
      try {
        worker = await context.waitForEvent('serviceworker', { timeout: 10000 });
      } catch (e) {
        worker = context.serviceWorkers()[0];
      }
      await dummy.close();
    }

    if (!worker) {
      console.warn('[E2E] Service worker not found. Detection may fail in pure headless environments.');
      await use('');
      return;
    }

    const extensionId = worker.url().split('/')[2];
    console.log(`[E2E] Detected Extension ID: ${extensionId}`);
    await use(extensionId);
  },
});

export const expect = test.expect;
