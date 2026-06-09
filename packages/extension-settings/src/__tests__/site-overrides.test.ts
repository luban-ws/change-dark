import { describe, expect, it } from 'vitest'

import { THEME_MODE_DYNAMIC } from '../constants'
import { PAGE_PALETTE_DARK, PAGE_PALETTE_SOLARIZED_DARK } from '../page-palette'
import {
  diffPartialThemeFilters,
  parseSiteOverridesState,
  resolveEffectivePagePalette,
  resolveEffectiveTheme,
  resolveEffectiveTypography,
} from '../site-overrides'
import { DEFAULT_THEME_FILTERS } from '../theme-filters'
import { DEFAULT_TYPOGRAPHY_STATE } from '../typography'

describe('RFC 016 — merge 全局 + 覆盖', () => {
  it('无覆盖时等同全局（模式恒为 dynamic）', () => {
    const state = parseSiteOverridesState(undefined)
    const r = resolveEffectiveTheme(
      'https://a.com',
      THEME_MODE_DYNAMIC,
      DEFAULT_THEME_FILTERS,
      state,
    )
    expect(r.themeMode).toBe(THEME_MODE_DYNAMIC)
    expect(r.themeFilters).toEqual(DEFAULT_THEME_FILTERS)
  })

  it('按 origin 覆盖部分滑块；legacy themeMode 被忽略', () => {
    const state = parseSiteOverridesState({
      v: 1,
      byOrigin: {
        'https://a.com': {
          themeMode: 'static' as never,
          themeFilters: { brightness: 120 },
        },
      },
    })
    const r = resolveEffectiveTheme(
      'https://a.com',
      THEME_MODE_DYNAMIC,
      DEFAULT_THEME_FILTERS,
      state,
    )
    expect(r.themeMode).toBe(THEME_MODE_DYNAMIC)
    expect(r.themeFilters.brightness).toBe(120)
    expect(r.themeFilters.contrast).toBe(DEFAULT_THEME_FILTERS.contrast)
  })

  it('diffPartialThemeFilters 仅保留与全局不同的键', () => {
    const g = DEFAULT_THEME_FILTERS
    const cur = { ...g, saturate: 50 }
    expect(diffPartialThemeFilters(g, cur)).toEqual({ saturate: 50 })
  })

  it('resolveEffectivePagePalette 按站覆盖', () => {
    const state = parseSiteOverridesState({
      v: 1,
      byOrigin: {
        'https://a.com': { pagePalette: PAGE_PALETTE_SOLARIZED_DARK },
      },
    })
    expect(resolveEffectivePagePalette('https://a.com', PAGE_PALETTE_DARK, state)).toBe(
      PAGE_PALETTE_SOLARIZED_DARK,
    )
    expect(resolveEffectivePagePalette('https://b.com', PAGE_PALETTE_DARK, state)).toBe(
      PAGE_PALETTE_DARK,
    )
  })

  it('RFC 018：resolveEffectiveTypography 合并 partial', () => {
    const state = parseSiteOverridesState({
      v: 1,
      byOrigin: {
        'https://a.com': {
          typography: { fontEnabled: true },
        },
      },
    })
    const r = resolveEffectiveTypography('https://a.com', DEFAULT_TYPOGRAPHY_STATE, state)
    expect(r.fontEnabled).toBe(true)
  })
})
