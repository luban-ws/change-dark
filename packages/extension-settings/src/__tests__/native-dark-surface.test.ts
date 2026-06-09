import { describe, expect, it } from 'vitest'

import {
  isNativelyDarkFromHtmlBodyBackgrounds,
  parseComputedBackgroundLuma,
} from '../native-dark-surface'

describe('parseComputedBackgroundLuma', () => {
  it('解析 rgb 并得到 luma', () => {
    const l = parseComputedBackgroundLuma('rgb(10, 12, 14)')
    expect(l).not.toBeNull()
    expect(l!).toBeLessThan(20)
  })

  it('近透明 rgba 视为无实色', () => {
    expect(parseComputedBackgroundLuma('rgba(0,0,0,0.02)')).toBeNull()
  })

  it('transparent 为 null', () => {
    expect(parseComputedBackgroundLuma('transparent')).toBeNull()
  })
})

describe('isNativelyDarkFromHtmlBodyBackgrounds', () => {
  it('html 已暗则 true', () => {
    expect(
      isNativelyDarkFromHtmlBodyBackgrounds('rgb(5, 5, 8)', 'rgba(0,0,0,0)', 40),
    ).toBe(true)
  })

  it('二者皆浅或透明则 false', () => {
    expect(
      isNativelyDarkFromHtmlBodyBackgrounds(
        'rgba(255,255,255,0)',
        'rgba(255,255,255,0)',
        40,
      ),
    ).toBe(false)
  })
})
