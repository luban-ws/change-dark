/**
 * RFC 031 P1-5：位图背景图亮度分析 — **像素计算在 Rust/WASM**，本文件仅常量 + 布局工具 + TS 薄封装。
 */

import {
  analyzeBackgroundImageRgba as wasmAnalyzeBackgroundImageRgba,
  brightnessFilterForBackgroundImage as wasmBrightnessFilter,
} from '@change-dark/dark-engine'

/** 下采样分析上限（DR 同档 32×32，与 `dark-color-utils` 一致）。 */
export const BG_IMAGE_MAX_ANALYSIS_PIXELS = 32 * 32

export const BG_IMAGE_TRANSPARENT_ALPHA_THRESHOLD = 0.05
export const BG_IMAGE_DARK_LIGHTNESS_THRESHOLD = 0.4
export const BG_IMAGE_LIGHT_LIGHTNESS_THRESHOLD = 0.7
export const BG_IMAGE_DARK_RATIO_THRESHOLD = 0.7
export const BG_IMAGE_LIGHT_RATIO_THRESHOLD = 0.7
export const BG_IMAGE_TRANSPARENT_RATIO_THRESHOLD = 0.1

/** 亮背景图默认压暗强度（Rust `DEFAULT_LIGHT_BG_BRIGHTNESS`）。 */
export const DEFAULT_LIGHT_BG_IMAGE_BRIGHTNESS = 0.7

export interface BackgroundImageAnalysis {
  isDark: boolean
  isLight: boolean
  isTransparent: boolean
  opaquePixelCount: number
  totalPixelCount: number
}

/**
 * 分析 RGBA 像素缓冲 — 委托 Rust/WASM `analyzeBackgroundImageRgba`。
 * TS 不做亮度数学。
 */
export function analyzeImagePixelBuffer(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): BackgroundImageAnalysis {
  const totalPixelCount = width * height
  if (totalPixelCount === 0 || data.length < totalPixelCount * 4) {
    return {
      isDark: false,
      isLight: false,
      isTransparent: false,
      opaquePixelCount: 0,
      totalPixelCount: 0,
    }
  }
  const view =
    data instanceof Uint8ClampedArray
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : data
  return wasmAnalyzeBackgroundImageRgba(view, width, height)
}

/** 亮图 → `brightness(70%)`；暗/透明 → null（Rust 决策）。 */
export function brightnessFilterForAnalysis(
  analysis: BackgroundImageAnalysis,
): string | null {
  return wasmBrightnessFilter(analysis)
}

/** 计算绘制到分析画布上的目标尺寸（纯布局，无像素数学）。 */
export function analysisCanvasSize(
  sourceWidth: number,
  sourceHeight: number,
): { width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 0, height: 0 }
  }
  const sourcePixels = sourceWidth * sourceHeight
  const k = Math.min(1, Math.sqrt(BG_IMAGE_MAX_ANALYSIS_PIXELS / sourcePixels))
  return {
    width: Math.max(1, Math.ceil(sourceWidth * k)),
    height: Math.max(1, Math.ceil(sourceHeight * k)),
  }
}
