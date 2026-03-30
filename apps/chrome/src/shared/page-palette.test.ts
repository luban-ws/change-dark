import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_PALETTE,
  PAGE_PALETTE_DARK,
  PAGE_PALETTE_SOLARIZED_DARK,
  parseOptionalPagePalette,
  parsePagePalette,
} from './page-palette'

describe('page-palette', () => {
  it('parsePagePalette 默认 dark', () => {
    expect(parsePagePalette(undefined)).toBe(DEFAULT_PAGE_PALETTE)
    expect(parsePagePalette('x')).toBe(PAGE_PALETTE_DARK)
  })

  it('parsePagePalette 识别 solarized-dark', () => {
    expect(parsePagePalette(PAGE_PALETTE_SOLARIZED_DARK)).toBe(PAGE_PALETTE_SOLARIZED_DARK)
  })

  it('parseOptionalPagePalette', () => {
    expect(parseOptionalPagePalette(undefined)).toBeUndefined()
    expect(parseOptionalPagePalette(PAGE_PALETTE_DARK)).toBe(PAGE_PALETTE_DARK)
    expect(parseOptionalPagePalette(PAGE_PALETTE_SOLARIZED_DARK)).toBe(PAGE_PALETTE_SOLARIZED_DARK)
    expect(parseOptionalPagePalette('bad')).toBeUndefined()
  })
})
