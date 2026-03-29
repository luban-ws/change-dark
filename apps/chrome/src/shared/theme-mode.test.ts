import { describe, expect, it } from 'vitest'

import {
  THEME_MODE_DYNAMIC,
  THEME_MODE_FILTER_CSS,
  THEME_MODE_FILTER_PLUS,
  THEME_MODE_STATIC,
} from './constants'
import { ALL_THEME_MODES, parseThemeMode } from './theme-mode'

describe('RFC 012 / 013 / 014 — parseThemeMode', () => {
  it('合法字面量原样返回', () => {
    expect(parseThemeMode(THEME_MODE_DYNAMIC)).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode(THEME_MODE_STATIC)).toBe(THEME_MODE_STATIC)
    expect(parseThemeMode(THEME_MODE_FILTER_CSS)).toBe(THEME_MODE_FILTER_CSS)
    expect(parseThemeMode(THEME_MODE_FILTER_PLUS)).toBe(THEME_MODE_FILTER_PLUS)
  })

  it('未知或缺失时默认 Dynamic（与历史单一路径一致）', () => {
    expect(parseThemeMode(undefined)).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode(null)).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode('')).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode('filter-plus-svg')).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode(1)).toBe(THEME_MODE_DYNAMIC)
  })

  it('ALL_THEME_MODES 与常量枚举一致', () => {
    expect(ALL_THEME_MODES).toEqual([
      THEME_MODE_DYNAMIC,
      THEME_MODE_STATIC,
      THEME_MODE_FILTER_CSS,
      THEME_MODE_FILTER_PLUS,
    ])
  })
})
