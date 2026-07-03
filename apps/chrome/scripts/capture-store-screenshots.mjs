#!/usr/bin/env node
/**
 * Chrome Web Store 截图：加载已构建扩展 → Options 页（中/英）→ 输出 1280×800 + 440×280。
 *
 * 前置：
 *   pnpm --filter @change-dark/chrome run build
 *   pnpm --filter @change-dark/chrome run test:e2e:install
 *
 * 用法：
 *   pnpm --filter @change-dark/chrome run screenshots:store
 */
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(CHROME_ROOT, '../..')
const DIST_DIR = path.join(CHROME_ROOT, 'dist')
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'docs/publish')
const FIXTURE_PAGES = path.join(CHROME_ROOT, 'e2e/pages')

const STORE_W = 1280
const STORE_H = 800
const PROMO_W = 440
const PROMO_H = 280
const FIXTURE_PORT = Number(process.env.E2E_FIXTURE_PORT ?? 4177)
const STORAGE_KEY_LANG = 'ui_language'

/** Solarized base03 — 与产品调色板一致 */
const LETTERBOX_RGB = { r: 0, g: 43, b: 54 }

const LOCALES = [
  { lang: 'en', fileSuffix: 'en', waitHeading: /Selena/i },
  { lang: 'zh_CN', fileSuffix: 'zh', waitHeading: /Selena|嫦娥/i },
]

function parseArgs(argv) {
  const outDir = argv.includes('--out-dir')
    ? argv[argv.indexOf('--out-dir') + 1]
    : DEFAULT_OUT_DIR
  const withPageDemo = !argv.includes('--ui-only')
  return { outDir: path.resolve(outDir), withPageDemo }
}

function ensureDistBuilt() {
  const manifestPath = path.join(DIST_DIR, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('[screenshots] Missing apps/chrome/dist — run: pnpm --filter @change-dark/chrome run build')
    process.exit(1)
  }
}

function startFixtureServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url?.split('?')[0] ?? '/'
      const rel = urlPath === '/' ? '/index.html' : urlPath
      const filePath = path.join(FIXTURE_PAGES, rel)
      if (!filePath.startsWith(FIXTURE_PAGES)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(data)
      })
    })
    server.on('error', reject)
    server.listen(FIXTURE_PORT, '127.0.0.1', () => resolve(server))
  })
}

async function resolveExtensionId(context) {
  const findId = () => {
    for (const worker of context.serviceWorkers()) {
      if (!worker.url().startsWith('chrome-extension://')) continue
      const id = worker.url().split('/')[2]
      if (id) return id
    }
    return null
  }

  let id = findId()
  if (id) return id

  // 触发 MV3 service worker 启动（与 e2e/helpers/worker.ts 相同）
  const bootstrap = await context.newPage()
  try {
    await bootstrap.goto(`http://127.0.0.1:${FIXTURE_PORT}/dynamic-light.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    })
  } catch {
    await bootstrap.goto('about:blank')
  }
  await bootstrap.close()

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    id = findId()
    if (id) return id
    try {
      await context.waitForEvent('serviceworker', { timeout: 2_000 })
    } catch {
      /* retry */
    }
  }
  throw new Error(
    'Extension service worker not found — run: HEADLESS=false pnpm run screenshots:store',
  )
}

async function setExtensionStorage(context, values) {
  const id = await resolveExtensionId(context)
  const worker = context.serviceWorkers().find((w) => w.url().includes(id))
  if (!worker) throw new Error(`Service worker missing for ${id}`)
  await worker.evaluate(async (data) => {
    await chrome.storage.local.set(data)
  }, values)
}

async function seedExtensionDefaults(context) {
  await setExtensionStorage(context, {
    'change-dark:schema-version': 2,
    'change-dark:policy': 'on',
    'change-dark:theme-mode': 'dynamic',
    'change-dark:site-list': { v: 2, mode: 'not-invert-listed', entries: [] },
    'change-dark:auto-dark-threshold': 80,
  })
}

async function composeLetterboxFrame(popupPng) {
  const meta = await sharp(popupPng).metadata()
  const popupW = meta.width ?? 380
  const popupH = meta.height ?? 600
  const left = Math.max(0, Math.floor((STORE_W - popupW) / 2))
  const top = Math.max(0, Math.floor((STORE_H - popupH) / 2))

  return sharp({
    create: {
      width: STORE_W,
      height: STORE_H,
      channels: 3,
      background: LETTERBOX_RGB,
    },
  })
    .composite([{ input: popupPng, left, top }])
    .png()
    .toBuffer()
}

async function writePromoFromStore(storePngPath, promoPath) {
  await sharp(storePngPath)
    .resize(PROMO_W, PROMO_H, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(promoPath)
}

async function captureOptionsUi(context, extensionId, locale, outPath) {
  await setExtensionStorage(context, { [STORAGE_KEY_LANG]: locale.lang })

  const page = await context.newPage()
  try {
    await page.setViewportSize({ width: STORE_W, height: STORE_H })
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.getByRole('heading', { name: locale.waitHeading }).first().waitFor({
      timeout: 20_000,
    })
    // Settings 主 Tab 可见
    await page.getByRole('tab', { name: /.+/ }).first().waitFor({ timeout: 10_000 })

    const popupRoot = page.locator('#root > div').first()
    await popupRoot.waitFor({ state: 'visible', timeout: 10_000 })
    const popupPng = await popupRoot.screenshot()
    const framed = await composeLetterboxFrame(popupPng)
    await fs.promises.writeFile(outPath, framed)
    console.log(`[screenshots] UI ${locale.fileSuffix} → ${outPath}`)
  } finally {
    await page.close()
  }
}

async function capturePageDemo(context, outPath) {
  const page = await context.newPage()
  try {
    await page.setViewportSize({ width: STORE_W, height: STORE_H })
    await page.goto(`http://127.0.0.1:${FIXTURE_PORT}/dynamic-light.html`, {
      waitUntil: 'load',
      timeout: 15_000,
    })
    await page.waitForFunction(
      (attr) => document.documentElement.hasAttribute(attr),
      'data-change-dark-root',
      { timeout: 20_000 },
    )
    await page.screenshot({ path: outPath, type: 'png' })
    console.log(`[screenshots] Page demo → ${outPath}`)
  } finally {
    await page.close()
  }
}

async function main() {
  const { outDir, withPageDemo } = parseArgs(process.argv.slice(2))
  ensureDistBuilt()
  await fs.promises.mkdir(outDir, { recursive: true })

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-store-shots-'))

  console.log(`[screenshots] Extension dist: ${DIST_DIR}`)
  console.log(`[screenshots] Output: ${outDir}`)

  let fixtureServer = null
  fixtureServer = await startFixtureServer()

  const headless =
    process.env.HEADLESS === 'true'
      ? true
      : process.env.HEADLESS === 'false'
        ? false
        : process.platform === 'linux'

  console.log(`[screenshots] Headless: ${headless} (macOS 默认 headed；可设 HEADLESS=true/false)`)

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      headless ? '--headless=new' : '',
      `--disable-extensions-except=${DIST_DIR}`,
      `--load-extension=${DIST_DIR}`,
    ].filter(Boolean),
    viewport: { width: STORE_W, height: STORE_H },
  })

  try {
    await seedExtensionDefaults(context)
    const extensionId = await resolveExtensionId(context)
    console.log(`[screenshots] Extension ID: ${extensionId}`)

    for (const locale of LOCALES) {
      const uiPath = path.join(outDir, `screenshot-${locale.fileSuffix}-1280x800.png`)
      await captureOptionsUi(context, extensionId, locale, uiPath)
      if (locale.fileSuffix === 'en') {
        await writePromoFromStore(uiPath, path.join(outDir, 'promo-tile-440x280.png'))
        console.log(`[screenshots] Promo → ${path.join(outDir, 'promo-tile-440x280.png')}`)
      }
    }

    if (withPageDemo) {
      await capturePageDemo(context, path.join(outDir, 'screenshot-page-demo-1280x800.png'))
    }
  } finally {
    await context.close()
    fixtureServer?.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }

  console.log('[screenshots] Done — upload files from docs/publish/ to Chrome Web Store listing.')
}

main().catch((err) => {
  console.error('[screenshots] Failed:', err)
  process.exit(1)
})
