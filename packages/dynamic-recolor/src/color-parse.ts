import type { Rgb } from './modify-colors'
import { parseCssColorTokenWasmRgb } from '@change-dark/dark-engine'
import { getRecolorSkipReason } from './recolor-known-limitations'

/**
 * RFC 031 §5.1：CSS 颜色 token 解析 — **Rust/WASM 真源**。
 * Phase 1 跳过原因（`var()`、`currentcolor`、`transparent` 等）在 TS 层先判；其余交 WASM。
 */
export function parseCssColorToken(input: string): Rgb | null {
  const s = input.trim()
  if (getRecolorSkipReason(s) != null) return null
  return parseCssColorTokenWasmRgb(s)
}

/** `#rgb` / `#rrggbb` — 委托 WASM（保留导出名供测试/直调）。 */
export function parseCssHexColor(input: string): Rgb | null {
  const s = input.trim()
  if (!s.startsWith('#')) return null
  return parseCssColorTokenWasmRgb(s)
}

/** 输出 `#rrggbb` 小写 hex（stylesheet 注入用）。 */
export function formatRgbHex({ r, g, b }: Rgb): string {
  const h = (n: number): string => n.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/** `rgb()` / `rgba()` 整数分量 — 不依赖 WASM，供 computed style 热路径与单测稳定使用。 */
function parseCssRgbIntegerTriplet(input: string): [number, number, number] | null {
  const match = input.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
  if (!match) return null
  const triplet = [Number(match[1]), Number(match[2]), Number(match[3])] as [
    number,
    number,
    number,
  ]
  if (triplet.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null
  return triplet
}

/**
 * 将 `getComputedStyle(...).backgroundColor` 等常见 `rgb`/`rgba` 形式解析为 0..255 三元组。
 * 仅接受 `rgb()`/`rgba()` 字面量（非 hex/hsl/命名色）。
 */
export function parseCssRgbToTriplet(input: string): [number, number, number] | null {
  const lower = input.trim().toLowerCase()
  if (!lower.startsWith('rgb')) return null
  const fast = parseCssRgbIntegerTriplet(input)
  if (fast) return fast
  const rgb = parseCssColorToken(input)
  if (!rgb) return null
  return [rgb.r, rgb.g, rgb.b]
}
