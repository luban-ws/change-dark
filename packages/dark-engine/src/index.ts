/**
 * 统一封装 WASM 与严格 CSP 下的纯 JS 回退实现（优先走 Rust/WASM，WASM 被宿主 CSP 禁止时无异常降级）。
 */
import * as fallback from './js-fallback'
import { bg, isWasmAvailable } from './wasm-runtime'

export { isWasmAvailable }

export function luminance_u8(r: number, g: number, b: number): number {
  return isWasmAvailable() ? bg.luminance_u8(r, g, b) : fallback.luminance_u8(r, g, b)
}

export function max_batch_rgb_bytes(): number {
  return isWasmAvailable() ? bg.max_batch_rgb_bytes() : fallback.max_batch_rgb_bytes()
}

export function mix_toward_black(
  r: number,
  g: number,
  b: number,
  amount: number,
): Uint8Array {
  return isWasmAvailable()
    ? bg.mix_toward_black(r, g, b, amount)
    : fallback.mix_toward_black(r, g, b, amount)
}

export function suggested_foreground_for_dark_bg(
  r: number,
  g: number,
  b: number,
): Uint8Array {
  return isWasmAvailable()
    ? bg.suggested_foreground_for_dark_bg(r, g, b)
    : fallback.suggested_foreground_for_dark_bg(r, g, b)
}

export function batch_relative_luminance(rgb: Uint8Array): Float64Array {
  return isWasmAvailable()
    ? bg.batch_relative_luminance(rgb)
    : fallback.batch_relative_luminance(rgb)
}

export function batch_mix_toward_black(rgb: Uint8Array, amount: number): Uint8Array {
  return isWasmAvailable()
    ? bg.batch_mix_toward_black(rgb, amount)
    : fallback.batch_mix_toward_black(rgb, amount)
}

export function kMeansRgbCentroids(
  rgb: Uint8Array,
  k: number,
  max_iter: number,
): Uint8Array {
  return isWasmAvailable()
    ? bg.kMeansRgbCentroids(rgb, k, max_iter)
    : fallback.kMeansRgbCentroids(rgb, k, max_iter)
}

export function kMeansDarkerCentroid(rgb: Uint8Array, max_iter: number): Uint8Array {
  return isWasmAvailable()
    ? bg.kMeansDarkerCentroid(rgb, max_iter)
    : fallback.kMeansDarkerCentroid(rgb, max_iter)
}

export function modifyColor(
  r: number,
  g: number,
  b: number,
  use_tag: number,
  profile_tag: number,
): Uint8Array {
  return isWasmAvailable()
    ? bg.modifyColor(r, g, b, use_tag, profile_tag)
    : fallback.modifyColor(r, g, b, use_tag, profile_tag)
}

export function batchModifyColor(
  rgb: Uint8Array,
  uses: Uint8Array,
  profile_tag: number,
): Uint8Array {
  return isWasmAvailable()
    ? bg.batchModifyColor(rgb, uses, profile_tag)
    : fallback.batchModifyColor(rgb, uses, profile_tag)
}

export function parseCssColorTokenWasm(input: string): Uint8Array {
  return isWasmAvailable()
    ? bg.parseCssColorTokenWasm(input)
    : fallback.parseCssColorTokenWasm(input)
}

export function analyzeBackgroundImageRgbaWasm(
  data: Uint8Array,
  width: number,
  height: number,
): Uint32Array {
  return isWasmAvailable()
    ? bg.analyzeBackgroundImageRgbaWasm(data, width, height)
    : fallback.analyzeBackgroundImageRgbaWasm(data, width, height)
}

export function brightnessFilterForBackgroundImageWasm(
  is_dark: boolean,
  is_light: boolean,
  is_transparent: boolean,
): string {
  return isWasmAvailable()
    ? bg.brightnessFilterForBackgroundImageWasm(is_dark, is_light, is_transparent)
    : fallback.brightnessFilterForBackgroundImageWasm(is_dark, is_light, is_transparent)
}

export function compileThemeDslWasm(source: string): string {
  return isWasmAvailable()
    ? bg.compileThemeDslWasm(source)
    : fallback.compileThemeDslWasm(source)
}

export function compileThemePatchDslWasm(source: string): string {
  return isWasmAvailable()
    ? bg.compileThemePatchDslWasm(source)
    : fallback.compileThemePatchDslWasm(source)
}

export function formatThemePatchDslWasm(patch_json: string): string {
  return isWasmAvailable()
    ? bg.formatThemePatchDslWasm(patch_json)
    : fallback.formatThemePatchDslWasm(patch_json)
}

export * from './background-image'
export * from './modify-color'
export * from './parse-css-color'
export * from './theme-dsl'
