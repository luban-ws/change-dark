import { describe, expect, it } from 'vitest'

import {
  PAGE_PALETTE_DARK,
  PAGE_PALETTE_SOLARIZED_DARK,
} from '@change-dark/extension-settings'
import {
  colorProfileForPagePalette,
  recolorProfileTagForPagePalette,
  SOLARIZED_DARK_PROFILE,
} from '../recolor-profile'
import { DEFAULT_DARK_PROFILE, modifyColor } from '../modify-colors'

describe('recolor-profile', () => {
  it('页面调色板映射 dark / solarized-dark', () => {
    expect(colorProfileForPagePalette(PAGE_PALETTE_DARK)).toBe(DEFAULT_DARK_PROFILE)
    expect(colorProfileForPagePalette(PAGE_PALETTE_SOLARIZED_DARK)).toBe(
      SOLARIZED_DARK_PROFILE,
    )
    expect(recolorProfileTagForPagePalette(PAGE_PALETTE_DARK)).toBe(0)
    expect(recolorProfileTagForPagePalette(PAGE_PALETTE_SOLARIZED_DARK)).toBe(1)
  })

  it('solarized profile 对白底改色与 dark 不同', () => {
    const rgb = { r: 255, g: 255, b: 255 }
    const dark = modifyColor(rgb, 'bg', DEFAULT_DARK_PROFILE)
    const solar = modifyColor(rgb, 'bg', SOLARIZED_DARK_PROFILE)
    expect(dark).not.toEqual(solar)
  })
})
