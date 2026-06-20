import { describe, expect, it } from 'vitest'

import {
  PAGE_PALETTE_DARK,
  PAGE_PALETTE_SOLARIZED_DARK,
  SOLARIZED_PAGE_BORDER_CSS,
  SOLARIZED_PAGE_INPUT_BG_CSS,
  SOLARIZED_PAGE_SURFACE_CSS,
} from '../page-palette'
import { resolveThemePageCssValues } from '../theme-palette'

describe('resolveThemePageCssValues', () => {
  const sampled = { pageBg: 'rgb(24, 26, 27)', pageFg: 'rgb(200, 200, 210)' }

  it('Solarized preset 使用固定 border/surface/input 字面量', () => {
    const values = resolveThemePageCssValues(PAGE_PALETTE_SOLARIZED_DARK, sampled)
    expect(values.pageBorder).toBe(SOLARIZED_PAGE_BORDER_CSS)
    expect(values.pageSurface).toBe(SOLARIZED_PAGE_SURFACE_CSS)
    expect(values.pageInputBg).toBe(SOLARIZED_PAGE_INPUT_BG_CSS)
  })

  it('通用 dark preset 使用 color-mix 推导', () => {
    const values = resolveThemePageCssValues(PAGE_PALETTE_DARK, sampled)
    expect(values.pageBorder).toContain('color-mix')
    expect(values.pageBorder).toContain('82%')
    expect(values.pageSurface).toContain('24%')
  })
})
