import { CSS_VAR_PAGE_BG, CSS_VAR_PAGE_BORDER, CSS_VAR_PAGE_FG } from '@change-dark/extension-settings'
import { describe, expect, it } from 'vitest'

import {
  isNeutralPaletteCandidate,
  paletteCssVarForRecolor,
  relativeRgbLuma,
} from '../palette-apply'

describe('paletteCssVarForRecolor', () => {
  it('中性亮底 → page-bg 变量', () => {
    expect(
      paletteCssVarForRecolor({ r: 255, g: 255, b: 255 }, 'bg'),
    ).toBe(`var(${CSS_VAR_PAGE_BG})`)
  })

  it('中性亮边 → page-border 变量', () => {
    expect(
      paletteCssVarForRecolor({ r: 255, g: 255, b: 255 }, 'border'),
    ).toBe(`var(${CSS_VAR_PAGE_BORDER})`)
  })

  it('中性深字 → page-fg 变量', () => {
    expect(paletteCssVarForRecolor({ r: 0, g: 0, b: 0 }, 'fg')).toBe(
      `var(${CSS_VAR_PAGE_FG})`,
    )
    expect(paletteCssVarForRecolor({ r: 65, g: 65, b: 65 }, 'fg')).toBe(
      `var(${CSS_VAR_PAGE_FG})`,
    )
  })

  it('饱和 accent 色不走 palette 变量', () => {
    expect(paletteCssVarForRecolor({ r: 255, g: 0, b: 0 }, 'fg')).toBeNull()
    expect(paletteCssVarForRecolor({ r: 26, g: 115, b: 232 }, 'bg')).toBeNull()
  })

  it('keyframes 深色底仍走 WASM（不绑 palette）', () => {
    expect(paletteCssVarForRecolor({ r: 0, g: 0, b: 0 }, 'bg')).toBeNull()
  })
})

describe('isNeutralPaletteCandidate', () => {
  it('区分灰阶与品牌色', () => {
    expect(isNeutralPaletteCandidate({ r: 200, g: 200, b: 200 })).toBe(true)
    expect(isNeutralPaletteCandidate({ r: 234, g: 67, b: 53 })).toBe(false)
  })
})

describe('relativeRgbLuma', () => {
  it('白 > 黑', () => {
    expect(relativeRgbLuma({ r: 255, g: 255, b: 255 })).toBeGreaterThan(
      relativeRgbLuma({ r: 0, g: 0, b: 0 }),
    )
  })
})
