import { describe, expect, it } from 'vitest'

import {
  buildBrightnessDarkenSvg,
  cssBrightnessFilterForImage,
  escapeXmlAttr,
  IMAGE_DARKEN_FILTER_ID,
} from '../image-darken'

describe('image-darken', () => {
  it('SVG 仅含 brightness slope，不含 invert/hue-rotate', () => {
    const svg = buildBrightnessDarkenSvg('data:image/png;base64,abc', 100, 50, 0.7)
    expect(svg).toContain(`filter="url(#${IMAGE_DARKEN_FILTER_ID})"`)
    expect(svg).toContain('feComponentTransfer')
    expect(svg).toContain('slope="0.7"')
    expect(svg.toLowerCase()).not.toContain('invert')
    expect(svg.toLowerCase()).not.toContain('hue-rotate')
  })

  it('escapeXmlAttr 转义 href 特殊字符', () => {
    expect(escapeXmlAttr(`a"b`)).toBe('a&quot;b')
  })

  it('cssBrightnessFilterForImage 返回 brightness 百分比', () => {
    expect(cssBrightnessFilterForImage(0.7)).toBe('brightness(70%)')
  })
})
