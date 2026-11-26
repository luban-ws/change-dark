import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEY_SITE_PROFILE_PATCHES } from '../constants'
import {
  SITE_PROFILE_PATCHES_SCHEMA_VERSION,
  parseSiteProfilePatch,
  parseSiteProfilePatchesState,
} from '../site-profile-patches'
import {
  clearSiteOverrideForOrigin,
  hasSiteScopedDataForOrigin,
  persistSiteProfilePatchForOrigin,
  readSiteProfilePatchForPage,
  readSiteProfilePatchesState,
} from '../storage'

function installChromeStorageMock(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial }
  const local = {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) {
        return { ...store }
      }
      if (typeof keys === 'string') {
        return keys in store ? { [keys]: store[keys] } : {}
      }
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {}
        for (const key of keys) {
          if (key in store) {
            out[key] = store[key]
          }
        }
        return out
      }
      const out: Record<string, unknown> = { ...keys }
      for (const key of Object.keys(keys)) {
        if (key in store) {
          out[key] = store[key]
        }
      }
      return out
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(store, items)
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete store[key]
      }
    }),
  }

  vi.stubGlobal('chrome', {
    runtime: { lastError: undefined },
    storage: { local },
  })

  return { store, local }
}

describe('parseSiteProfilePatchesState', () => {
  it('解析合法条目并保留有效字段', () => {
    const parsed = parseSiteProfilePatchesState({
      v: SITE_PROFILE_PATCHES_SCHEMA_VERSION,
      byOrigin: {
        'https://example.com': {
          disabled: true,
          surfaceRepair: {
            neverPaint: ['.hero-bg'],
            componentClassHints: ['custom-card'],
            minPanelAreaPx: 5000,
            gutterProbe: { mainSelector: 'main.app', insetPx: 16 },
          },
          recolor: {
            forceShorthandProperties: ['background'],
            cssVarSubstitute: {
              '--brand-bg': { use: 'bg', fallback: 'var(--brand-bg)' },
              '--brand-fg': { use: 'fg' },
            },
          },
          customCss: 'body { color: #eee; }',
        },
      },
    })

    expect(parsed.v).toBe(1)
    expect(parsed.byOrigin['https://example.com']).toEqual({
      disabled: true,
      surfaceRepair: {
        neverPaint: ['.hero-bg'],
        componentClassHints: ['custom-card'],
        minPanelAreaPx: 5000,
        gutterProbe: { mainSelector: 'main.app', insetPx: 16 },
      },
      recolor: {
        forceShorthandProperties: ['background'],
        cssVarSubstitute: {
          '--brand-bg': { use: 'bg', fallback: 'var(--brand-bg)' },
          '--brand-fg': { use: 'fg' },
        },
      },
      customCss: 'body { color: #eee; }',
    })
  })

  it('剔除非法 origin、空 patch 与无效 color use', () => {
    const parsed = parseSiteProfilePatchesState({
      v: 1,
      byOrigin: {
        'chrome://settings': { disabled: true },
        'https://example.com/with-path': { disabled: true },
        'not-a-url': { disabled: true },
        'https://empty.example': {},
        'https://bad-use.example': {
          recolor: {
            cssVarSubstitute: {
              '--bad': { use: 'accent' },
              'not-css-var': { use: 'bg' },
            },
          },
        },
        'https://partial.example': {
          recolor: {
            cssVarSubstitute: {
              '--bad': { use: 'invalid' },
              '--ok': { use: 'border' },
            },
          },
        },
      },
    })

    expect(Object.keys(parsed.byOrigin)).toEqual(['https://partial.example'])
    expect(parsed.byOrigin['https://partial.example']).toEqual({
      recolor: {
        cssVarSubstitute: {
          '--ok': { use: 'border' },
        },
      },
    })
    expect(parseSiteProfilePatch({ disabled: false })).toBeNull()
  })
})

describe('site profile patch storage operations', () => {
  beforeEach(() => {
    installChromeStorageMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('写入、按 pageOrigin 读取、location 回退、检测与清除单站 patch', async () => {
    const origin = 'https://app.example.com'

    expect(await readSiteProfilePatchForPage(origin)).toBeUndefined()
    expect(await hasSiteScopedDataForOrigin(origin)).toBe(false)

    await persistSiteProfilePatchForOrigin(origin, {
      surfaceRepair: {
        neverPaint: ['.skip-me'],
      },
      recolor: {
        cssVarSubstitute: {
          '--surface': { use: 'bg' },
        },
      },
    })

    const state = await readSiteProfilePatchesState()
    expect(state.byOrigin[origin]).toEqual({
      surfaceRepair: { neverPaint: ['.skip-me'] },
      recolor: { cssVarSubstitute: { '--surface': { use: 'bg' } } },
    })

    const forPage = await readSiteProfilePatchForPage(origin)
    expect(forPage).toEqual(state.byOrigin[origin])
    expect(await readSiteProfilePatchForPage(`${origin}/settings?tab=1`)).toBeUndefined()

    vi.stubGlobal('location', { origin })
    expect(await readSiteProfilePatchForPage()).toEqual(state.byOrigin[origin])

    expect(await hasSiteScopedDataForOrigin(origin)).toBe(true)

    await clearSiteOverrideForOrigin(origin)
    expect(await readSiteProfilePatchForPage(origin)).toBeUndefined()
    expect(await hasSiteScopedDataForOrigin(origin)).toBe(false)
  })

  it('persistSiteProfilePatchForOrigin(null) 与非 http(s) origin 安全处理', async () => {
    const origin = 'https://sub.example.com'
    await persistSiteProfilePatchForOrigin(origin, { disabled: true })
    expect(await hasSiteScopedDataForOrigin(origin)).toBe(true)

    await persistSiteProfilePatchForOrigin(origin, null)
    const state = await readSiteProfilePatchesState()
    expect(state.byOrigin[origin]).toBeUndefined()
    expect(await hasSiteScopedDataForOrigin(origin)).toBe(false)

    const { store } = installChromeStorageMock({
      [STORAGE_KEY_SITE_PROFILE_PATCHES]: {
        v: 1,
        byOrigin: { 'https://sub.example.com': { disabled: true } },
      },
    })
    expect(await readSiteProfilePatchForPage('chrome://extensions')).toBeUndefined()
    expect(store[STORAGE_KEY_SITE_PROFILE_PATCHES]).toBeDefined()
  })
})
