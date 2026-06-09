import { test as base, chromium, type BrowserContext } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import { resolveExtensionServiceWorker } from './helpers/worker'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async ({}, use) => {
    const extensionPath = path.resolve(__dirname, '../dist')
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-chrome-ext-'))
    console.log(`[E2E] Loading extension from: ${extensionPath}`)
    console.log(`[E2E] Using isolated temp profile: ${userDataDir}`)

    const headless = process.env.HEADLESS === 'true'
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless,
      args: [
        headless ? '--headless=new' : '',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ].filter(Boolean),
    })

    console.log(`[E2E] Internal Chromium Path: ${chromium.executablePath()}`)

    await use(context)

    await context.close()
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      console.warn(`[E2E] Failed to cleanup temp profile: ${userDataDir}`)
    }
  },
  extensionId: async ({ context }, use) => {
    const extensionId = await resolveExtensionServiceWorker(context)
    console.log(`[E2E] Detected Extension ID: ${extensionId}`)
    await use(extensionId)
  },
})

export const expect = test.expect
