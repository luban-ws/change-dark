/**
 * 主题调色板 = 改色引擎的单一契约：`:root` 上的 `--cd-page-bg` / `--cd-page-fg`
 * 驱动中性表面与正文色；accent / 饱和色仍走 WASM profile。
 */

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
} from '@change-dark/extension-settings'
import type { ColorUse, Rgb } from './modify-colors'

/** sRGB 相对亮度 [0, 1]。 */
export function relativeRgbLuma({ r, g, b }: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** 低色度 ≈ 白/灰/黑表面或正文，非品牌色按钮/链接。 */
export function isNeutralPaletteCandidate({ r, g, b }: Rgb): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min
  if (chroma < 35) return true
  return max > 0 && chroma / max < 0.15
}

/**
 * 若作者原色属于「应由当前主题 preset 接管」的中性 token，返回对应 CSS 变量；
 * 变量值由 `buildStaticDarkCss` 按 palette 写入 `:root`，整条引擎共享同一 preset。
 */
export function paletteCssVarForRecolor(original: Rgb, use: ColorUse): string | null {
  if (!isNeutralPaletteCandidate(original)) return null
  const l = relativeRgbLuma(original)
  switch (use) {
    case 'bg':
      return l > 0.55 ? `var(${CSS_VAR_PAGE_BG})` : null
    case 'fg':
      return l < 0.42 ? `var(${CSS_VAR_PAGE_FG})` : null
    case 'border':
      if (l > 0.55) return `var(${CSS_VAR_PAGE_BORDER})`
      // 作者暗色细线（ring/hairline 暗分支）→ 仍用 theme 分隔色
      if (l >= 0.12 && l <= 0.55) return `var(${CSS_VAR_PAGE_BORDER})`
      return null
    default:
      return null
  }
}

/** WASM 批输出：中性色绑 preset 变量，accent 保留 profile 字面量。 */
export function resolveThemedRecolorCssValue(
  original: Rgb,
  use: ColorUse,
  wasmRgb: Rgb,
  formatHex: (rgb: Rgb) => string,
): string {
  return paletteCssVarForRecolor(original, use) ?? formatHex(wasmRgb)
}
