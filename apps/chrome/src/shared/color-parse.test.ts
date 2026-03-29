import { describe, expect, it } from 'vitest'

import { parseCssRgbToTriplet } from './color-parse'

describe('parseCssRgbToTriplet', () => {
  it('解析 rgb / rgba', () => {
    expect(parseCssRgbToTriplet('rgb(10, 20, 30)')).toEqual([10, 20, 30])
    expect(parseCssRgbToTriplet('rgba(255, 0, 128, 0.5)')).toEqual([255, 0, 128])
  })

  it('忽略 transparent 与空串', () => {
    expect(parseCssRgbToTriplet('transparent')).toBeNull()
    expect(parseCssRgbToTriplet('')).toBeNull()
  })

  it('拒绝非 rgb 形式', () => {
    expect(parseCssRgbToTriplet('hsl(0,0%,0%)')).toBeNull()
    expect(parseCssRgbToTriplet('red')).toBeNull()
  })
})
