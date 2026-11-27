import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from './fixtures'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')

test.describe('Popup Open Performance & Async Boot Shell', () => {
  test('static popup shell avoids blocking CSS/storage preload and enforces bundle budgets', () => {
    const htmlPath = path.join(DIST_DIR, 'src/popup/index.html')
    const html = fs.readFileSync(htmlPath, 'utf8')

    // No external blocking stylesheets or storage modulepreload in entry HTML
    expect(html).not.toMatch(/<link\b[^>]*rel=["']stylesheet["']/i)
    expect(html).not.toMatch(/<link\b[^>]*storage-[^"']*\.js/i)

    // Entry module script must be async so DCL/FCP are not script-blocked
    const entryMatch = html.match(
      /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/i,
    )
    expect(entryMatch).toBeTruthy()
    expect(entryMatch![0]).toMatch(/\basync\b/i)

    const entryRel = entryMatch![1]!.replace(/^\//, '')
    const entryBytes = fs.statSync(path.join(DIST_DIR, entryRel)).size
    expect(entryBytes).toBeLessThanOrEqual(10 * 1024)

    // Boot shell + loading progress indicator must exist in static HTML
    expect(html).toContain('id="cd-boot-shell"')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('id="cd-boot-status"')

    // Pruned async Radix CSS chunk budget (down from ~679 KB unpruned)
    const assetsDir = path.join(DIST_DIR, 'assets')
    const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'))
    expect(cssFiles.length).toBeGreaterThan(0)
    for (const cssFile of cssFiles) {
      const size = fs.statSync(path.join(assetsDir, cssFile)).size
      expect(size).toBeLessThanOrEqual(220 * 1024)
    }
  })

  test('opens popup with visible loading indicator, single storage IPC, and fast warm DCL', async ({
    context,
    extensionId,
  }) => {
    expect(extensionId).toBeTruthy()

    const warmDcls: number[] = []
    const warmLoads: number[] = []

    for (let run = 1; run <= 3; run += 1) {
      const popup = await context.newPage()
      const errors: string[] = []
      popup.on('pageerror', (err) => errors.push(err.message))
      popup.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })

      await popup.addInitScript(() => {
        const win = window as unknown as {
          __cdPerf?: { storageGets: number; storageSets: number; tabQueries: number }
        }
        win.__cdPerf = { storageGets: 0, storageSets: 0, tabQueries: 0 }

        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const origGet = chrome.storage.local.get.bind(chrome.storage.local)
          chrome.storage.local.get = ((keys: unknown, cb?: (r: unknown) => void) => {
            win.__cdPerf!.storageGets += 1
            return cb ? origGet(keys as never, cb as never) : origGet(keys as never)
          }) as typeof chrome.storage.local.get

          const origSet = chrome.storage.local.set.bind(chrome.storage.local)
          chrome.storage.local.set = ((obj: Record<string, unknown>, cb?: () => void) => {
            win.__cdPerf!.storageSets += 1
            return cb ? origSet(obj, cb) : origSet(obj)
          }) as typeof chrome.storage.local.set
        }

        if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
          const origQuery = chrome.tabs.query.bind(chrome.tabs)
          chrome.tabs.query = ((q: chrome.tabs.QueryInfo, cb?: (r: chrome.tabs.Tab[]) => void) => {
            win.__cdPerf!.tabQueries += 1
            return cb ? origQuery(q, cb) : origQuery(q)
          }) as typeof chrome.tabs.query
        }
      })

      const t0 = Date.now()
      await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`, {
        waitUntil: 'domcontentloaded',
      })
      await expect(popup.locator('#cd-boot-shell, .rt-Heading').first()).toBeVisible({
        timeout: 5000,
      })
      await expect(popup.locator('.rt-Heading').first()).toBeVisible({ timeout: 10000 })
      const fullUiMs = Date.now() - t0

      // Wait briefly so any background storage write settles before counting
      await popup.waitForTimeout(100)

      const metrics = await popup.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as
          | PerformanceNavigationTiming
          | undefined
        const paints = performance.getEntriesByType('paint')
        const fcp = paints.find((p) => p.name === 'first-contentful-paint')?.startTime ?? -1
        const perf = (
          window as unknown as {
            __cdPerf?: { storageGets: number; storageSets: number; tabQueries: number }
          }
        ).__cdPerf
        return {
          dcl: Math.round(nav?.domContentLoadedEventEnd ?? 0),
          load: Math.round(nav?.loadEventEnd ?? 0),
          fcp: Math.round(fcp),
          storageGets: perf?.storageGets ?? -1,
          storageSets: perf?.storageSets ?? -1,
          tabQueries: perf?.tabQueries ?? -1,
        }
      })

      console.log(
        `[POPUP-PERF] run#${run}: dcl=${metrics.dcl}ms load=${metrics.load}ms fcp=${metrics.fcp}ms fullUI=${fullUiMs}ms storageGets=${metrics.storageGets} storageSets=${metrics.storageSets} tabQueries=${metrics.tabQueries}`,
      )

      expect(errors).toEqual([])
      expect(metrics.storageGets).toBe(1)
      expect(metrics.tabQueries).toBe(1)

      if (run >= 2) {
        warmDcls.push(metrics.dcl)
        warmLoads.push(metrics.load)
      }

      await popup.close()
    }

    for (const dcl of warmDcls) {
      expect(dcl).toBeLessThan(500)
    }
    for (const load of warmLoads) {
      expect(load).toBeLessThan(1500)
    }
  })
})
