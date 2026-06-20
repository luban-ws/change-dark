/**
 * 页面 palette → 最终 page 背景/前景 CSS 值（Solarized 固定色 vs 采样暗色）。
 */

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
  CSS_VAR_PAGE_INPUT_BG,
  CSS_VAR_PAGE_SURFACE,
} from './constants'
import {
  PAGE_PALETTE_SOLARIZED_DARK,
  SOLARIZED_PAGE_BG_CSS,
  SOLARIZED_PAGE_BORDER_CSS,
  SOLARIZED_PAGE_FG_CSS,
  SOLARIZED_PAGE_INPUT_BG_CSS,
  SOLARIZED_PAGE_SURFACE_CSS,
  type PagePalette,
} from './page-palette'

export interface PageColorPair {
  pageBg: string
  pageFg: string
}

/** `:root` 上 border / surface / input 的字面量（写入 CSS 变量初值）。 */
export interface ThemePageDerivedColors {
  pageBorder: string
  pageSurface: string
  pageInputBg: string
}

export interface ThemePageCssValues extends PageColorPair, ThemePageDerivedColors {}

/**
 * Surface / inline 铺底统一引用 preset 变量；切换 palette 时随 `:root` 自动更新。
 */
export const THEME_PAGE_BACKGROUND_CSS = `var(${CSS_VAR_PAGE_BG})` as const

export const THEME_PAGE_FOREGROUND_CSS = `var(${CSS_VAR_PAGE_FG})` as const

/** 边框 / ring / hairline 引用 preset 分隔色。 */
export const THEME_PAGE_BORDER_CSS = `var(${CSS_VAR_PAGE_BORDER})` as const

export const THEME_PAGE_SURFACE_CSS = `var(${CSS_VAR_PAGE_SURFACE})` as const

export const THEME_PAGE_INPUT_BG_CSS = `var(${CSS_VAR_PAGE_INPUT_BG})` as const

/** 将 palette 选择应用到已采样或固定的 page 色对。 */
export function resolvePageColorsForPalette(
  palette: PagePalette,
  sampled: PageColorPair,
): PageColorPair {
  if (palette === PAGE_PALETTE_SOLARIZED_DARK) {
    return {
      pageBg: SOLARIZED_PAGE_BG_CSS,
      pageFg: SOLARIZED_PAGE_FG_CSS,
    }
  }
  return sampled
}

function deriveThemePageColors(pageBg: string, pageFg: string): ThemePageDerivedColors {
  return {
    pageBorder: `color-mix(in srgb, ${pageFg} 82%, ${pageBg})`,
    pageSurface: `color-mix(in srgb, ${pageFg} 24%, ${pageBg})`,
    pageInputBg: `color-mix(in srgb, ${pageBg} 65%, black)`,
  }
}

/** bg/fg + border/surface/input 全组 preset 值（供 buildDarkCss 写入 :root）。 */
export function resolveThemePageCssValues(
  palette: PagePalette,
  sampled: PageColorPair,
): ThemePageCssValues {
  const { pageBg, pageFg } = resolvePageColorsForPalette(palette, sampled)
  if (palette === PAGE_PALETTE_SOLARIZED_DARK) {
    return {
      pageBg,
      pageFg,
      pageBorder: SOLARIZED_PAGE_BORDER_CSS,
      pageSurface: SOLARIZED_PAGE_SURFACE_CSS,
      pageInputBg: SOLARIZED_PAGE_INPUT_BG_CSS,
    }
  }
  return { pageBg, pageFg, ...deriveThemePageColors(pageBg, pageFg) }
}
