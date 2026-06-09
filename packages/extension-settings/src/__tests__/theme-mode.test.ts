import { describe, expect, it } from 'vitest'

import { THEME_MODE_DYNAMIC } from '../constants'
import { ALL_THEME_MODES, parseThemeMode } from '../theme-mode'

describe('parseThemeMode（Dynamic-only）', () => {
  it('合法值与任意 storage 值均解析为 dynamic', () => {
    expect(parseThemeMode(THEME_MODE_DYNAMIC)).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode(undefined)).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode(null)).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode('')).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode('filter-css')).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode('static')).toBe(THEME_MODE_DYNAMIC)
    expect(parseThemeMode(1)).toBe(THEME_MODE_DYNAMIC)
  })

  it('ALL_THEME_MODES 仅含 dynamic', () => {
    expect(ALL_THEME_MODES).toEqual([THEME_MODE_DYNAMIC])
  })
})
