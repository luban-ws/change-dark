import { describe, expect, it } from 'vitest'

import { formatRgbHex } from '../color-parse'
import {
  DEFAULT_DARK_PROFILE,
  hslToRgb,
  modifyColor,
  rgbToHsl,
  scale,
  type ColorUse,
  type Rgb,
} from '../modify-colors'
import golden from './fixtures/modify-color-golden.json'

/** WCAG 相对亮度（结构断言用）。 */
function luma({ r, g, b }: Rgb): number {
  const lin = (c: number): number => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

describe('scale', () => {
  it('线性映射', () => {
    expect(scale(0.5, 0, 1, 0, 100)).toBe(50)
    expect(scale(1, 0.5, 1, 0.4, 0.1)).toBeCloseTo(0.1, 5)
  })
  it('退化区间返回 outLo', () => {
    expect(scale(5, 2, 2, 9, 99)).toBe(9)
  })
})

describe('rgbToHsl / hslToRgb 往返', () => {
  const cases: Rgb[] = [
    { r: 255, g: 255, b: 255 },
    { r: 0, g: 0, b: 0 },
    { r: 128, g: 128, b: 128 },
    { r: 26, g: 115, b: 232 },
    { r: 255, g: 235, b: 59 },
  ]
  it('往返误差 ≤2/通道', () => {
    for (const c of cases) {
      const back = hslToRgb(rgbToHsl(c))
      expect(Math.abs(back.r - c.r)).toBeLessThanOrEqual(2)
      expect(Math.abs(back.g - c.g)).toBeLessThanOrEqual(2)
      expect(Math.abs(back.b - c.b)).toBeLessThanOrEqual(2)
    }
  })
})

describe('modifyColor — 背景（RFC 031 §2.2）', () => {
  it('白底变暗（L ≤ maxBgLightness 区）', () => {
    const out = modifyColor({ r: 255, g: 255, b: 255 }, 'bg')
    // 白底应落到接近 poleBg（很暗）
    expect(luma(out)).toBeLessThan(0.1)
  })
  it('黑底保持黑（L=0 → 0）', () => {
    const out = modifyColor({ r: 0, g: 0, b: 0 }, 'bg')
    expect(luma(out)).toBeLessThan(0.02)
  })
  it('中灰背景压暗到 ~maxBgLightness 区', () => {
    const out = modifyColor({ r: 128, g: 128, b: 128 }, 'bg')
    const lOut = rgbToHsl(out).l
    expect(lOut).toBeLessThanOrEqual(DEFAULT_DARK_PROFILE.maxBgLightness + 0.02)
  })
  it('所有背景输出亮度 ≤ poleFg（不会变成亮底）', () => {
    for (let v = 0; v <= 255; v += 51) {
      const out = modifyColor({ r: v, g: v, b: v }, 'bg')
      expect(rgbToHsl(out).l).toBeLessThan(0.5)
    }
  })
})

describe('modifyColor — 前景（RFC 031 §2.2）', () => {
  it('黑字提亮到可读（L ≥ minFgLightness）', () => {
    const out = modifyColor({ r: 0, g: 0, b: 0 }, 'fg')
    expect(rgbToHsl(out).l).toBeGreaterThanOrEqual(
      DEFAULT_DARK_PROFILE.minFgLightness - 0.02,
    )
  })
  it('白字保持亮', () => {
    const out = modifyColor({ r: 255, g: 255, b: 255 }, 'fg')
    expect(rgbToHsl(out).l).toBeGreaterThanOrEqual(
      DEFAULT_DARK_PROFILE.minFgLightness,
    )
  })
})

describe('对比度（暗底亮字反转后仍可读）', () => {
  it('白底黑字 → 暗底亮字，对比方向不丢', () => {
    const bg = modifyColor({ r: 255, g: 255, b: 255 }, 'bg')
    const fg = modifyColor({ r: 0, g: 0, b: 0 }, 'fg')
    // 改后前景应明显亮于背景
    expect(luma(fg)).toBeGreaterThan(luma(bg) + 0.3)
  })
})

describe('色相保持（彩色非中性不被洗成灰）', () => {
  it('蓝链接前景仍偏蓝（hue 在蓝域）', () => {
    const out = modifyColor({ r: 26, g: 115, b: 232 }, 'fg')
    const h = rgbToHsl(out).h
    expect(h).toBeGreaterThan(195)
    expect(h).toBeLessThan(250)
  })
})

describe('边框（RFC 031 §2.2 反向窄区）', () => {
  it('亮边框压暗、暗边框提亮，落入 [0.2,0.5]', () => {
    const light = rgbToHsl(modifyColor({ r: 220, g: 220, b: 220 }, 'border')).l
    const dark = rgbToHsl(modifyColor({ r: 20, g: 20, b: 20 }, 'border')).l
    expect(light).toBeGreaterThanOrEqual(0.2)
    expect(light).toBeLessThanOrEqual(0.5)
    expect(dark).toBeGreaterThanOrEqual(0.2)
    expect(dark).toBeLessThanOrEqual(0.5)
  })
})

// RFC 031 §2.7：golden 向量 — WASM 输出与 Rust 真源对齐（见 modify-color-golden.json）。
describe('§2.7 golden 向量（WASM / Rust 校准）', () => {
  it.each(golden.vectors as Array<{ input: string; rgb: [number, number, number]; use: ColorUse; expected: string }>)(
    '$input ($use) → $expected',
    ({ rgb: [r, g, b], use, expected }) => {
      const out = modifyColor({ r, g, b }, use)
      expect(formatRgbHex(out)).toBe(expected)
    },
  )
})
