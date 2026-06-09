import type { BrowserContext } from '@playwright/test'
import { extensionServiceWorker } from './worker'

const ROOT_ATTR = 'data-change-dark-root'
const STYLE_ELEMENT_ID = 'change-dark-style'

export const E2E_STORAGE = {
  POLICY: 'change-dark:policy',
  AUTO_THRESHOLD: 'change-dark:auto-dark-threshold',
  SITE_LIST: 'change-dark:site-list',
  THEME_MODE: 'change-dark:theme-mode',
  SCHEMA: 'change-dark:schema-version',
} as const

export const FIXTURE_BASE = `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT ?? 4173}`

export function fixtureUrl(pageName: string): string {
  return `${FIXTURE_BASE}/${pageName}`
}

export async function setExtensionStorage(
  context: BrowserContext,
  values: Record<string, unknown>,
): Promise<void> {
  const worker = await extensionServiceWorker(context)
  await worker.evaluate(async (data) => {
    await chrome.storage.local.set(data)
  }, values)
}

export async function readExtensionStorageKey(
  context: BrowserContext,
  key: string,
): Promise<unknown> {
  const worker = await extensionServiceWorker(context)
  return worker.evaluate(async (k) => {
    const snap = await chrome.storage.local.get(k)
    return snap[k]
  }, key)
}

/** 默认开启强制暗色（Dynamic-only 产品）。 */
export async function seedDynamicOn(context: BrowserContext): Promise<void> {
  await setExtensionStorage(context, {
    [E2E_STORAGE.SCHEMA]: 2,
    [E2E_STORAGE.POLICY]: 'on',
    [E2E_STORAGE.THEME_MODE]: 'dynamic',
    [E2E_STORAGE.SITE_LIST]: { v: 2, mode: 'not-invert-listed', entries: [] },
    [E2E_STORAGE.AUTO_THRESHOLD]: 80,
    ui_language: 'en',
  })
}

export async function waitForForcedDarkRoot(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    (attr) => document.documentElement.hasAttribute(attr),
    ROOT_ATTR,
    { timeout: 20_000 },
  )
}

export async function waitForNoForcedDarkRoot(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    (attr) => !document.documentElement.hasAttribute(attr),
    ROOT_ATTR,
    { timeout: 20_000 },
  )
}

export async function readHtmlBackgroundLuma(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const css = getComputedStyle(document.documentElement).backgroundColor
    const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (!m) return 255
    const r = +m[1]!
    const g = +m[2]!
    const b = +m[3]!
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  })
}

export async function readInjectedStyleText(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate((id) => document.getElementById(id)?.textContent ?? '', STYLE_ELEMENT_ID)
}

export { ROOT_ATTR, STYLE_ELEMENT_ID }
