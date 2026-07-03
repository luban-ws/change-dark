import { describe, expect, it } from 'vitest'

import { parseCssColorToken, parseCssHexColor, parseCssRgbToTriplet } from '../color-parse'

describe('parseCssRgbToTriplet', () => {
  it('解析 rgb / rgba', () => {
    expect(parseCssRgbToTriplet('rgb(10, 20, 30)')).toEqual([10, 20, 30])
    expect(parseCssRgbToTriplet('rgba(255, 0, 128, 0.5)')).toEqual([255, 0, 128])
    // 纯 TS 路径：不依赖 WASM 初始化
    expect(parseCssRgbToTriplet('rgb(248, 249, 250)')).toEqual([248, 249, 250])
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

describe('parseCssColorToken', () => {
  it('hex 与 rgb 互通', () => {
    expect(parseCssColorToken('#000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseCssColorToken('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 })
  })

  it('Rust/WASM 解析 hsl 与命名色', () => {
    expect(parseCssColorToken('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 })
    expect(parseCssColorToken('red')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('var() 仍跳过', () => {
    expect(parseCssColorToken('var(--text)')).toBeNull()
  })

  it('parseCssHexColor 拒绝非法 hex', () => {
    expect(parseCssHexColor('#12')).toBeNull()
    expect(parseCssHexColor('000')).toBeNull()
  })
})
