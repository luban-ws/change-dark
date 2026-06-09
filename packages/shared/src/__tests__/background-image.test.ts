/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import {
  analyzeImagePixelBuffer,
  brightnessFilterForAnalysis,
  analysisCanvasSize,
  BG_IMAGE_MAX_ANALYSIS_PIXELS,
  extractCssBackgroundImageUrls,
  isCssGradientBackground,
  hasBitmapBackgroundImage,
  recolorGradientColorStops,
  recolorBackgroundImageDeclaration,
  DEFAULT_DARK_PROFILE,
  parseCssColorToken,
} from '../index'

describe('analysisCanvasSize', () => {
  it('大图缩小：像素数应在 max 的 2× 内', () => {
    const { width, height } = analysisCanvasSize(1000, 500)
    expect(width * height).toBeLessThanOrEqual(BG_IMAGE_MAX_ANALYSIS_PIXELS * 2)
  })
  it('小图不放大', () => {
    expect(analysisCanvasSize(10, 10)).toEqual({ width: 10, height: 10 })
  })
  it('空图返回 0×0', () => {
    expect(analysisCanvasSize(0, 100)).toEqual({ width: 0, height: 0 })
  })
})

describe('analyzeImagePixelBuffer + brightnessFilterForAnalysis', () => {
  it('纯白图 → isLight → brightness(70%)', () => {
    const w = 4; const h = 4
    const data = new Uint8ClampedArray(w * h * 4).fill(255)
    const analysis = analyzeImagePixelBuffer(data, w, h)
    expect(analysis.isLight).toBe(true)
    expect(analysis.isDark).toBe(false)
    expect(brightnessFilterForAnalysis(analysis)).toBe('brightness(70%)')
  })

  it('纯黑图 → isDark → null', () => {
    const w = 4; const h = 4
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < data.length; i += 4) { data[i + 3] = 255 }
    const analysis = analyzeImagePixelBuffer(data, w, h)
    expect(analysis.isDark).toBe(true)
    expect(brightnessFilterForAnalysis(analysis)).toBeNull()
  })

  it('全透明图 → isTransparent → null', () => {
    const data = new Uint8ClampedArray(16).fill(0)
    const analysis = analyzeImagePixelBuffer(data, 2, 2)
    expect(analysis.isTransparent).toBe(true)
    expect(brightnessFilterForAnalysis(analysis)).toBeNull()
  })
})

describe('extractCssBackgroundImageUrls', () => {
  it('单 url', () => {
    expect(extractCssBackgroundImageUrls('url("/img/a.png")')).toEqual(['/img/a.png'])
  })
  it('多 url', () => {
    const r = extractCssBackgroundImageUrls('url(a.png), url("b.svg")')
    expect(r).toEqual(['a.png', 'b.svg'])
  })
  it('空值', () => {
    expect(extractCssBackgroundImageUrls('none')).toEqual([])
  })
})

describe('isCssGradientBackground', () => {
  it('linear-gradient', () => {
    expect(isCssGradientBackground('linear-gradient(#000,#fff)')).toBe(true)
  })
  it('非渐变', () => {
    expect(isCssGradientBackground('url(a.png)')).toBe(false)
  })
})

describe('recolorGradientColorStops', () => {
  it('改写渐变色标', () => {
    const result = recolorGradientColorStops('linear-gradient(#fff, #000)', 'bg')
    expect(result).not.toBeNull()
    // 白色 #fff 和黑色 #000 应都被替换为暗色变换后的值（不含原始白/黑）
    expect(result!.toLowerCase()).not.toBe('linear-gradient(#fff, #000)')
    // 结果应仍是 gradient 形式
    expect(result).toMatch(/linear-gradient/)
  })
})

describe('recolorBackgroundImageDeclaration', () => {
  it('渐变 background-image 改色', () => {
    const val = 'linear-gradient(to right, #fff, #000)'
    const result = recolorBackgroundImageDeclaration('background-image', val)
    expect(result).not.toBeNull()
    const parsed = parseCssColorToken(
      result!.match(/(#[0-9a-f]{3,8})/i)?.[1] ?? '',
    )
    expect(parsed).not.toBeNull()
  })

  it('位图 url 跳过（运行时分析）', () => {
    const result = recolorBackgroundImageDeclaration('background-image', 'url("img.jpg")')
    expect(result).toBeNull()
  })

  it('非 background 属性返回 null', () => {
    expect(recolorBackgroundImageDeclaration('color', '#fff')).toBeNull()
  })
})
