/**
 * RFC 0031：WASM `modifyColor` / `batchModifyColor` 的 TS 薄封装。
 */
import * as fallback from './js-fallback'
import { bg, isWasmAvailable } from './wasm-runtime'

export const COLOR_USE_BG = 0 as const
export const COLOR_USE_FG = 1 as const
export const COLOR_USE_BORDER = 2 as const

/** §5.1.1：与 Rust `PROFILE_TAG_*` 对齐。 */
export const PROFILE_TAG_DARK = 0 as const
export const PROFILE_TAG_SOLARIZED_DARK = 1 as const

export type ColorUseTag =
  | typeof COLOR_USE_BG
  | typeof COLOR_USE_FG
  | typeof COLOR_USE_BORDER

export type RecolorProfileTag =
  | typeof PROFILE_TAG_DARK
  | typeof PROFILE_TAG_SOLARIZED_DARK

export function colorUseToTag(use: 'bg' | 'fg' | 'border'): ColorUseTag {
  if (use === 'fg') return COLOR_USE_FG
  if (use === 'border') return COLOR_USE_BORDER
  return COLOR_USE_BG
}

/** 单像素改色，返回 [r,g,b]（Rust/WASM 真源）。 */
export function modifyColorRgb(
  r: number,
  g: number,
  b: number,
  useTag: ColorUseTag,
  profileTag: RecolorProfileTag = PROFILE_TAG_DARK,
): [number, number, number] {
  const out = isWasmAvailable()
    ? bg.modifyColor(r, g, b, useTag, profileTag)
    : fallback.modifyColor(r, g, b, useTag, profileTag)
  return [out[0]!, out[1]!, out[2]!]
}

/** 批量改色：rgb 扁平 3*n，uses 平行 0/1/2。 */
export function batchModifyColorRgb(
  rgb: Uint8Array,
  uses: Uint8Array,
  profileTag: RecolorProfileTag = PROFILE_TAG_DARK,
): Uint8Array {
  return isWasmAvailable()
    ? bg.batchModifyColor(rgb, uses, profileTag)
    : fallback.batchModifyColor(rgb, uses, profileTag)
}
