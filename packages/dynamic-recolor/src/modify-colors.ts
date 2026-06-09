/**
 * RFC 031 §2：`modifyColor` 真源在 Rust/WASM（`dark-color-utils` + `dark-engine`）。
 * 本文件保留类型、默认 profile 与 HSL 工具（测试/文档用）；改色走 WASM。
 */

import {
  batchModifyColorRgb,
  colorUseToTag,
  modifyColor as wasmModifyColor,
  PROFILE_TAG_DARK,
  PROFILE_TAG_SOLARIZED_DARK,
} from '@luban-ws/dark-engine'

/** 色用途标签（决定走哪条曲线，RFC 031 §2.6）。 */
export type ColorUse = 'bg' | 'fg' | 'border'

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsl {
  /** 0..360 */
  h: number
  /** 0..1 */
  s: number
  /** 0..1 */
  l: number
}

/**
 * 颜色模型 profile（RFC 031 §5.1.1）：DR 默认值是**默认 profile**，非合约。
 */
export interface ColorProfile {
  id: 'dark' | 'solarized-dark'
  maxBgLightness: number
  minFgLightness: number
  poleBg: Hsl
  poleFg: Hsl
}

/** RFC 031 §2.1：`dark` 默认 profile。pole bg≈#181a1b、fg≈#e8e6e3。 */
export const DEFAULT_DARK_PROFILE: ColorProfile = {
  id: 'dark',
  maxBgLightness: 0.4,
  minFgLightness: 0.55,
  poleBg: rgbToHsl({ r: 0x18, g: 0x1a, b: 0x1b }),
  poleFg: rgbToHsl({ r: 0xe8, g: 0xe6, b: 0xe3 }),
}

/** 线性缩放（RFC 031 §2.5 基元，测试/文档用）。 */
export function scale(
  x: number,
  inLo: number,
  inHi: number,
  outLo: number,
  outHi: number,
): number {
  if (inHi === inLo) return outLo
  return outLo + ((x - inLo) * (outHi - outLo)) / (inHi - inLo)
}

/** sRGB [0,255] → HSL（H 0..360, S/L 0..1）。 */
export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
        break
      case gn:
        h = ((bn - rn) / d + 2) * 60
        break
      default:
        h = ((rn - gn) / d + 4) * 60
    }
  }
  return { h, s, l }
}

/** HSL → sRGB [0,255]（四舍五入）。 */
export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const ch = (t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return {
    r: Math.round(ch(hn + 1 / 3) * 255),
    g: Math.round(ch(hn) * 255),
    b: Math.round(ch(hn - 1 / 3) * 255),
  }
}

/**
 * 主入口：Rust/WASM 改色（RFC 031 §2）。
 */
export function modifyColor(
  rgb: Rgb,
  use: ColorUse,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): Rgb {
  const out = wasmModifyColor(
    rgb.r,
    rgb.g,
    rgb.b,
    colorUseToTag(use),
    colorProfileToWasmTag(profile),
  )
  return { r: out[0]!, g: out[1]!, b: out[2]! }
}

function colorProfileToWasmTag(profile: ColorProfile) {
  return profile.id === 'solarized-dark'
    ? PROFILE_TAG_SOLARIZED_DARK
    : PROFILE_TAG_DARK
}

/** RFC 031 §5.3：整表/整块改色一次 WASM 批变换（禁逐色过桥）。 */
export function batchModifyColors(
  items: ReadonlyArray<{ rgb: Rgb; use: ColorUse }>,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): Rgb[] {
  if (items.length === 0) return []
  const tag = colorProfileToWasmTag(profile)
  const rgb = new Uint8Array(items.length * 3)
  const uses = new Uint8Array(items.length)
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!
    const o = i * 3
    rgb[o] = item.rgb.r
    rgb[o + 1] = item.rgb.g
    rgb[o + 2] = item.rgb.b
    uses[i] = colorUseToTag(item.use)
  }
  const out = batchModifyColorRgb(rgb, uses, tag)
  return Array.from({ length: items.length }, (_, i) => {
    const o = i * 3
    return { r: out[o]!, g: out[o + 1]!, b: out[o + 2]! }
  })
}
