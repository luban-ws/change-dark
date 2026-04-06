/**
 * storage.ts 核心 read/persist 函数覆盖率测试
 * 覆盖：readGlobalPolicy, readShouldApplyForcedDarkForPage, readSamplingBudget,
 *        readEffectiveThemeForPage, readEffectivePagePaletteForPage,
 *        readEffectiveTypographyForPage, persistGlobalPolicy,
 *        toggleCurrentOriginInDenylist, readSiteCustomCssForPage
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  POLICY_AUTO,
  POLICY_OFF,
  POLICY_ON,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_PAGE_PALETTE,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SCHEMA_VERSION,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_THEME_MODE,
  STORAGE_KEY_TYPOGRAPHY,
  STORAGE_KEY_SITE_CUSTOM_CSS,
} from '../constants'
import { CURRENT_STORAGE_SCHEMA_VERSION } from '../migration'
import {
  readGlobalPolicy,
  readShouldApplyForcedDarkForPage,
  readSamplingBudget,
  readEffectiveThemeForPage,
  readEffectivePagePaletteForPage,
  readEffectiveTypographyForPage,
  readSiteCustomCssForPage,
  persistGlobalPolicy,
  toggleCurrentOriginInDenylist,
} from '../storage'

// ─── Chrome storage mock helpers ───────────────────────────────────────────

function makeChrome(store: Record<string, unknown> = {}) {
  return {
    storage: {
      local: {
        get: vi.fn().mockImplementation(async (keys: string[]) => {
          const result: Record<string, unknown> = {}
          for (const k of keys) if (k in store) result[k] = store[k]
          return result
        }),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
  }
}

beforeEach(() => {
  vi.unstubAllGlobals()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── readGlobalPolicy ───────────────────────────────────────────────────────

describe('readGlobalPolicy', () => {
  it('returns ON when policy key = "on"', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_POLICY]: 'on' }))
    expect(await readGlobalPolicy()).toBe(POLICY_ON)
  })

  it('returns AUTO when policy key = "auto"', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_POLICY]: 'auto' }))
    expect(await readGlobalPolicy()).toBe(POLICY_AUTO)
  })

  it('returns OFF when policy key = "off"', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_POLICY]: 'off' }))
    expect(await readGlobalPolicy()).toBe(POLICY_OFF)
  })

  it('defaults to ON when no key stored', async () => {
    vi.stubGlobal('chrome', makeChrome({}))
    expect(await readGlobalPolicy()).toBe(POLICY_ON)
  })

  it('falls back to legacy enabled=true as ON', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_ENABLED]: true }))
    expect(await readGlobalPolicy()).toBe(POLICY_ON)
  })

  it('falls back to legacy enabled=false as OFF', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_ENABLED]: false }))
    expect(await readGlobalPolicy()).toBe(POLICY_OFF)
  })
})

// ─── readShouldApplyForcedDarkForPage ───────────────────────────────────────

describe('readShouldApplyForcedDarkForPage', () => {
  it('returns true for ON policy with no site list', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_POLICY]: 'on' }))
    expect(await readShouldApplyForcedDarkForPage('https://example.com')).toBe(true)
  })

  it('returns true for AUTO policy with no site list', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_POLICY]: 'auto' }))
    expect(await readShouldApplyForcedDarkForPage('https://example.com')).toBe(true)
  })

  it('returns false for OFF policy', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_POLICY]: 'off' }))
    expect(await readShouldApplyForcedDarkForPage('https://example.com')).toBe(false)
  })

  it('returns false when origin is not in invert-listed-only mode list', async () => {
    const siteList = JSON.stringify({ mode: 'invert-listed-only', entries: [] })
    vi.stubGlobal('chrome', makeChrome({
      [STORAGE_KEY_POLICY]: 'on',
      [STORAGE_KEY_SITE_LIST]: siteList,
    }))
    expect(await readShouldApplyForcedDarkForPage('https://example.com')).toBe(false)
  })
})

// ─── readSamplingBudget ─────────────────────────────────────────────────────

describe('readSamplingBudget', () => {
  it('returns default budget when storage is empty', async () => {
    vi.stubGlobal('chrome', makeChrome({}))
    const budget = await readSamplingBudget()
    expect(budget).toBeDefined()
    expect(typeof budget.maxNodes).toBe('number')
    expect(typeof budget.maxMs).toBe('number')
  })
})

// ─── readEffectiveThemeForPage ──────────────────────────────────────────────

describe('readEffectiveThemeForPage', () => {
  it('returns default theme mode when storage empty', async () => {
    vi.stubGlobal('chrome', makeChrome({}))
    const { themeMode } = await readEffectiveThemeForPage()
    expect(typeof themeMode).toBe('string')
  })

  it('returns stored theme mode', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_THEME_MODE]: 'filter-css' }))
    const { themeMode } = await readEffectiveThemeForPage()
    expect(themeMode).toBe('filter-css')
  })
})

// ─── readEffectivePagePaletteForPage ────────────────────────────────────────

describe('readEffectivePagePaletteForPage', () => {
  it('returns "dark" as default', async () => {
    vi.stubGlobal('chrome', makeChrome({}))
    const palette = await readEffectivePagePaletteForPage()
    expect(palette).toBe('dark')
  })

  it('returns "solarized-dark" when stored', async () => {
    vi.stubGlobal('chrome', makeChrome({ [STORAGE_KEY_PAGE_PALETTE]: 'solarized-dark' }))
    const palette = await readEffectivePagePaletteForPage()
    expect(palette).toBe('solarized-dark')
  })
})

// ─── readEffectiveTypographyForPage ─────────────────────────────────────────

describe('readEffectiveTypographyForPage', () => {
  it('returns default typography settings when storage empty', async () => {
    vi.stubGlobal('chrome', makeChrome({}))
    const typo = await readEffectiveTypographyForPage()
    expect(typeof typo.fontEnabled).toBe('boolean')
    expect(typeof typo.textStrokeEnabled).toBe('boolean')
  })
})

// ─── readSiteCustomCssForPage ───────────────────────────────────────────────

describe('readSiteCustomCssForPage', () => {
  it('returns empty string when no custom css stored', async () => {
    vi.stubGlobal('chrome', makeChrome({}))
    const css = await readSiteCustomCssForPage('https://example.com')
    expect(css).toBe('')
  })
})

// ─── persistGlobalPolicy ────────────────────────────────────────────────────

describe('persistGlobalPolicy', () => {
  it('sets policy + schema and removes legacy enabled', async () => {
    const chrome = makeChrome()
    vi.stubGlobal('chrome', chrome)
    await persistGlobalPolicy(POLICY_AUTO)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [STORAGE_KEY_POLICY]: POLICY_AUTO,
      [STORAGE_KEY_SCHEMA_VERSION]: CURRENT_STORAGE_SCHEMA_VERSION,
    })
    expect(chrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEY_ENABLED)
  })

  it('persists OFF policy correctly', async () => {
    const chrome = makeChrome()
    vi.stubGlobal('chrome', chrome)
    await persistGlobalPolicy(POLICY_OFF)
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ [STORAGE_KEY_POLICY]: POLICY_OFF })
    )
  })
})

// ─── toggleCurrentOriginInDenylist ──────────────────────────────────────────

describe('toggleCurrentOriginInDenylist', () => {
  it('adds origin to deny list when not present', async () => {
    const chrome = makeChrome({})
    vi.stubGlobal('chrome', chrome)
    await toggleCurrentOriginInDenylist('https://example.com')
    expect(chrome.storage.local.set).toHaveBeenCalled()
  })
})
