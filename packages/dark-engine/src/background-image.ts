/**
 * RFC 0031 P1-5：WASM 背景图像素分析薄封装（Rust 真源）。
 */
import * as fallback from './js-fallback'
import { bg, isWasmAvailable } from './wasm-runtime'

export interface WasmBackgroundImageAnalysis {
  isDark: boolean
  isLight: boolean
  isTransparent: boolean
  opaquePixelCount: number
  totalPixelCount: number
}

/** RGBA 像素缓冲 → 亮度分类（Rust/WASM 真源，严格 CSP 时回退 JS）。 */
export function analyzeBackgroundImageRgba(
  data: Uint8Array,
  width: number,
  height: number,
): WasmBackgroundImageAnalysis {
  const out = isWasmAvailable()
    ? bg.analyzeBackgroundImageRgbaWasm(data, width, height)
    : fallback.analyzeBackgroundImageRgbaWasm(data, width, height)
  return {
    isDark: out[0] === 1,
    isLight: out[1] === 1,
    isTransparent: out[2] === 1,
    opaquePixelCount: out[3]!,
    totalPixelCount: out[4]!,
  }
}

/** 亮图 → `brightness(70%)`；否则空字符串。 */
export function brightnessFilterForBackgroundImage(
  analysis: Pick<WasmBackgroundImageAnalysis, 'isDark' | 'isLight' | 'isTransparent'>,
): string | null {
  const s = isWasmAvailable()
    ? bg.brightnessFilterForBackgroundImageWasm(
        analysis.isDark,
        analysis.isLight,
        analysis.isTransparent,
      )
    : fallback.brightnessFilterForBackgroundImageWasm(
        analysis.isDark,
        analysis.isLight,
        analysis.isTransparent,
      )
  return s || null
}
