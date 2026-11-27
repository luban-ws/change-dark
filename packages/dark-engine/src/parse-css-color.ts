/**
 * RFC 0031 §5.1：WASM CSS 颜色 token 解析薄封装。
 */
import * as fallback from './js-fallback'
import { bg, isWasmAvailable } from './wasm-runtime'

export interface ParsedCssRgb {
  r: number
  g: number
  b: number
}

/** Rust 解析 `#hex` / `rgb()` / `hsl()` / 命名色；`var()` → null。 */
export function parseCssColorTokenWasmRgb(input: string): ParsedCssRgb | null {
  const trimmed = input.trim()
  const out = isWasmAvailable()
    ? bg.parseCssColorTokenWasm(trimmed)
    : fallback.parseCssColorTokenWasm(trimmed)
  if (out.length !== 3) return null
  return { r: out[0]!, g: out[1]!, b: out[2]! }
}
