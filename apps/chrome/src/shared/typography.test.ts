import { describe, expect, it } from 'vitest'

import { ROOT_ATTR } from './constants'
import {
  DEFAULT_TYPOGRAPHY_SETTINGS,
  DEFAULT_TYPOGRAPHY_STATE,
  TYPOGRAPHY_FONT_PRESET_CUSTOM,
  TYPOGRAPHY_FONT_PRESET_SANS,
  buildTypographyCss,
  clampTypographyStrokeWidthPx,
  diffPartialTypography,
  isTypographyInjectionActive,
  parseTypographyState,
  resolveFontFamilyCss,
  sanitizeCustomFontFamily,
} from './typography'

describe('RFC 018 typography', () => {
  it('sanitizeCustomFontFamily 去除危险字符并截断', () => {
    expect(sanitizeCustomFontFamily('  Foo Bar  ')).toBe('Foo Bar')
    const stripped = sanitizeCustomFontFamily('a;b{color:red}')
    expect(stripped).not.toMatch(/[;{}]/)
    expect(sanitizeCustomFontFamily('x'.repeat(300)).length).toBeLessThanOrEqual(200)
  })

  it('parseTypographyState 非法回退默认', () => {
    expect(parseTypographyState(undefined)).toEqual(DEFAULT_TYPOGRAPHY_STATE)
    expect(parseTypographyState({ v: 99 }).fontEnabled).toBe(false)
  })

  it('parseTypographyState 合法合并', () => {
    const s = parseTypographyState({
      v: 1,
      fontEnabled: true,
      fontPreset: TYPOGRAPHY_FONT_PRESET_SANS,
      textStrokeEnabled: true,
      textStrokeWidthPx: 0.12,
    })
    expect(s.fontEnabled).toBe(true)
    expect(s.textStrokeWidthPx).toBe(0.12)
  })

  it('clampTypographyStrokeWidthPx', () => {
    expect(clampTypographyStrokeWidthPx(NaN)).toBe(DEFAULT_TYPOGRAPHY_SETTINGS.textStrokeWidthPx)
    expect(clampTypographyStrokeWidthPx(99)).toBe(0.6)
    expect(clampTypographyStrokeWidthPx(-1)).toBe(0)
  })

  it('resolveFontFamilyCss：custom 含回退栈', () => {
    const css = resolveFontFamilyCss({
      ...DEFAULT_TYPOGRAPHY_SETTINGS,
      fontPreset: TYPOGRAPHY_FONT_PRESET_CUSTOM,
      customFontFamily: '"Foo Bar", serif',
    })
    expect(css).toContain('Foo Bar')
    expect(css.toLowerCase()).toContain('segoe ui')
  })

  it('buildTypographyCss：全关时为空', () => {
    expect(buildTypographyCss(DEFAULT_TYPOGRAPHY_SETTINGS)).toBe('')
  })

  it('buildTypographyCss：字体与描边含 ROOT_ATTR', () => {
    const css = buildTypographyCss({
      ...DEFAULT_TYPOGRAPHY_SETTINGS,
      fontEnabled: true,
      fontPreset: TYPOGRAPHY_FONT_PRESET_SANS,
      textStrokeEnabled: true,
      textStrokeWidthPx: 0.1,
    })
    expect(css).toContain(`html[${ROOT_ATTR}]`)
    expect(css).toContain('-webkit-text-stroke')
    expect(css).toContain('font-family')
    expect(isTypographyInjectionActive(DEFAULT_TYPOGRAPHY_SETTINGS)).toBe(false)
    expect(
      isTypographyInjectionActive({ ...DEFAULT_TYPOGRAPHY_SETTINGS, fontEnabled: true }),
    ).toBe(true)
  })

  it('diffPartialTypography', () => {
    const g = DEFAULT_TYPOGRAPHY_SETTINGS
    const cur = { ...g, fontEnabled: true, textStrokeWidthPx: 0.2 }
    expect(diffPartialTypography(g, cur)).toEqual({ fontEnabled: true, textStrokeWidthPx: 0.2 })
  })
})
