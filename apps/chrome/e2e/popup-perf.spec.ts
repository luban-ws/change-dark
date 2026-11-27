import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from './fixtures'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME_DIR = path.resolve(__dirname, '..')
const DIST_DIR = path.join(CHROME_DIR, 'dist')
const BUDGET_PATH = path.join(CHROME_DIR, 'perf-budget.json')
const REPORT_PATH = path.join(CHROME_DIR, 'test-results/perf-report.json')
const DARK_ENGINE_MJS = path.resolve(CHROME_DIR, '../../packages/dark-engine/dist/index.mjs')

interface PerfBudget {
  static: {
    maxEntryHtmlBytes: number
    maxEntryScriptBytes: number
    maxCssBytes: number
    maxPopupAsyncJsBytes: number
    maxContentScriptBytes: number
    maxDarkEngineWasmDataUrls: number
  }
  runtime: {
    warmRuns: number
    maxColdStorageGets: number
    expectedStorageGets: number
    expectedTabQueries: number
    maxWarmStorageSets: number
    maxWarmMedianDclMs: number
    maxWarmMedianLoadMs: number
    maxWarmMedianFcpMs: number
    maxWarmMedianFullUiMs: number
  }
}

interface RunSample {
  run: number
  dcl: number
  load: number
  fcp: number
  fullUI: number
  storageGets: number
  storageSets: number
  tabQueries: number
}

function readBudget(): PerfBudget {
  return JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8')) as PerfBudget
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]!
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

function mergePerfReport(patch: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  let existing: Record<string, unknown> = {}
  if (fs.existsSync(REPORT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as Record<string, unknown>
    } catch {
      existing = {}
    }
  }
  const merged = {
    ...existing,
    ...patch,
    generatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
}

test.describe('Popup Open Performance & Async Boot Shell', () => {
  test('static popup shell avoids blocking CSS/storage preload and enforces bundle budgets', () => {
    const budget = readBudget()
    const htmlPath = path.join(DIST_DIR, 'src/popup/index.html')
    const html = fs.readFileSync(htmlPath, 'utf8')
    const entryHtmlBytes = fs.statSync(htmlPath).size

    expect(entryHtmlBytes).toBeLessThanOrEqual(budget.static.maxEntryHtmlBytes)
    expect(html).not.toMatch(/<link\b[^>]*rel=["']stylesheet["']/i)
    expect(html).not.toMatch(/<link\b[^>]*storage-[^"']*\.js/i)

    const entryMatch = html.match(
      /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/i,
    )
    expect(entryMatch).toBeTruthy()
    expect(entryMatch![0]).toMatch(/\basync\b/i)

    const entryRel = entryMatch![1]!.replace(/^\//, '')
    const entryScriptBytes = fs.statSync(path.join(DIST_DIR, entryRel)).size
    expect(entryScriptBytes).toBeLessThanOrEqual(budget.static.maxEntryScriptBytes)

    expect(html).toContain('id="cd-boot-shell"')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('id="cd-boot-status"')

    const assetsDir = path.join(DIST_DIR, 'assets')
    const assetFiles = fs.readdirSync(assetsDir)
    const cssFiles = assetFiles.filter((f) => f.endsWith('.css'))
    expect(cssFiles.length).toBeGreaterThan(0)
    const cssBytes = Math.max(...cssFiles.map((f) => fs.statSync(path.join(assetsDir, f)).size))
    expect(cssBytes).toBeLessThanOrEqual(budget.static.maxCssBytes)

    const popupAsyncJs = assetFiles.filter(
      (f) => f.startsWith('mount-app-') && f.endsWith('.js'),
    )
    expect(popupAsyncJs.length).toBeGreaterThan(0)
    const popupAsyncJsBytes = Math.max(
      ...popupAsyncJs.map((f) => fs.statSync(path.join(assetsDir, f)).size),
    )
    expect(popupAsyncJsBytes).toBeLessThanOrEqual(budget.static.maxPopupAsyncJsBytes)

    const contentJs = assetFiles.filter(
      (f) => f.startsWith('index.ts-') && !f.startsWith('index.ts-loader-') && f.endsWith('.js'),
    )
    expect(contentJs.length).toBeGreaterThan(0)
    const contentScriptBytes = Math.max(
      ...contentJs.map((f) => fs.statSync(path.join(assetsDir, f)).size),
    )
    expect(contentScriptBytes).toBeLessThanOrEqual(budget.static.maxContentScriptBytes)

    let darkEngineWasmDataUrls: number | null = null
    if (fs.existsSync(DARK_ENGINE_MJS)) {
      const mjs = fs.readFileSync(DARK_ENGINE_MJS, 'utf8')
      darkEngineWasmDataUrls = mjs.split('data:application/wasm').length - 1
      expect(darkEngineWasmDataUrls).toBe(budget.static.maxDarkEngineWasmDataUrls)
    }

    mergePerfReport({
      budgets: budget,
      staticMetrics: {
        entryHtmlBytes,
        entryScriptBytes,
        cssBytes,
        popupAsyncJsBytes,
        contentScriptBytes,
        darkEngineWasmDataUrls,
      },
    })
  })

  test('opens popup with visible loading indicator, single storage IPC, and fast warm p50', async ({
    context,
    extensionId,
  }) => {
    test.setTimeout(180_000)
    expect(extensionId).toBeTruthy()
    const budget = readBudget()
    const totalRuns = 1 + budget.runtime.warmRuns

    const samples: RunSample[] = []

    for (let run = 1; run <= totalRuns; run += 1) {
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
      const fullUI = Date.now() - t0

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

      const sample: RunSample = { run, ...metrics, fullUI }
      samples.push(sample)

      console.log(
        `[POPUP-PERF] run#${run}: dcl=${sample.dcl}ms load=${sample.load}ms fcp=${sample.fcp}ms fullUI=${sample.fullUI}ms storageGets=${sample.storageGets} storageSets=${sample.storageSets} tabQueries=${sample.tabQueries}`,
      )

      expect(errors).toEqual([])
      if (run === 1) {
        expect(sample.storageGets).toBeLessThanOrEqual(budget.runtime.maxColdStorageGets)
      } else {
        expect(sample.storageGets).toBe(budget.runtime.expectedStorageGets)
        expect(sample.storageSets).toBeLessThanOrEqual(budget.runtime.maxWarmStorageSets)
      }
      expect(sample.tabQueries).toBe(budget.runtime.expectedTabQueries)

      await popup.close()
    }

    const coldRun = samples[0]!
    const warmRuns = samples.slice(1)
    const warmMedian = {
      dcl: median(warmRuns.map((s) => s.dcl)),
      load: median(warmRuns.map((s) => s.load)),
      fcp: median(warmRuns.map((s) => s.fcp)),
      fullUI: median(warmRuns.map((s) => s.fullUI)),
    }

    console.log(
      `[POPUP-PERF] warm p50 (${warmRuns.length} runs): dcl=${warmMedian.dcl}ms load=${warmMedian.load}ms fcp=${warmMedian.fcp}ms fullUI=${warmMedian.fullUI}ms`,
    )

    mergePerfReport({
      budgets: budget,
      coldRun,
      warmRuns,
      warmMedian,
    })

    expect(warmMedian.dcl).toBeLessThan(budget.runtime.maxWarmMedianDclMs)
    expect(warmMedian.load).toBeLessThan(budget.runtime.maxWarmMedianLoadMs)
    expect(warmMedian.fcp).toBeLessThan(budget.runtime.maxWarmMedianFcpMs)
    expect(warmMedian.fullUI).toBeLessThan(budget.runtime.maxWarmMedianFullUiMs)
  })
})
