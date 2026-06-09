import { describe, expect, it } from 'vitest'

import { parseCssColorToken, parseCssHexColor } from '../color-parse'
import {
  readInlineStyleProperty,
  recolorInlineDeclaration,
  recolorInlineStyleAttribute,
} from '../modify-css'
import { DEFAULT_DARK_PROFILE, modifyColor, rgbToHsl } from '../modify-colors'

describe('parseCssHexColor', () => {
  it('解析 #rgb / #rrggbb', () => {
    expect(parseCssHexColor('#000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseCssHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseCssHexColor('#1a73e8')).toEqual({ r: 26, g: 115, b: 232 })
  })
})

describe('readInlineStyleProperty', () => {
  it('从 style 字符串读取 longhand', () => {
    expect(readInlineStyleProperty('margin: 8px; color: #000', 'color')).toBe('#000')
    expect(readInlineStyleProperty('color: #000 !important', 'color')).toBe('#000')
  })
})

describe('RFC 031 S1 — 单元素单条 color', () => {
  it('<p style="color:#000"> → fg 暗色可读', () => {
    const out = recolorInlineStyleAttribute('color:#000')
    const rgb = parseCssColorToken(out.match(/color:\s*(#[0-9a-f]+)/i)?.[1] ?? '')
    expect(rgb).not.toBeNull()

    const expected = modifyColor({ r: 0, g: 0, b: 0 }, 'fg')
    expect(rgb).toEqual(expected)
    expect(rgbToHsl(rgb!).l).toBeGreaterThanOrEqual(
      DEFAULT_DARK_PROFILE.minFgLightness - 0.02,
    )
  })

  it('recolorInlineDeclaration("color", "#000") 与 modifyColor 一致', () => {
    const out = recolorInlineDeclaration('color', '#000')
    expect(out).toBeTruthy()
    expect(parseCssColorToken(out!)).toEqual(
      modifyColor({ r: 0, g: 0, b: 0 }, 'fg'),
    )
  })

  it('非改色属性原样保留', () => {
    expect(recolorInlineStyleAttribute('margin: 8px; color:#000')).toBe(
      'margin: 8px; color: #e8e6e3',
    )
  })

  it('无法解析的颜色值跳过', () => {
    expect(recolorInlineDeclaration('color', 'var(--text)')).toBeNull()
    expect(recolorInlineStyleAttribute('color: var(--text)')).toBe(
      'color: var(--text)',
    )
  })

  it('hsl / 命名色经 Rust 解析后改色', () => {
    const hslOut = recolorInlineDeclaration('color', 'hsl(0, 100%, 50%)')
    expect(hslOut).toBeTruthy()
    expect(parseCssColorToken(hslOut!)).toEqual(
      modifyColor({ r: 255, g: 0, b: 0 }, 'fg'),
    )

    const namedOut = recolorInlineDeclaration('background-color', 'red')
    expect(namedOut).toBeTruthy()
    expect(parseCssColorToken(namedOut!)).toEqual(
      modifyColor({ r: 255, g: 0, b: 0 }, 'bg'),
    )
  })
})
