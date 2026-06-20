/**
 * 页面 palette → 最终 page 背景/前景 CSS 值（Solarized 固定色 vs 采样暗色）。
 */

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
} from './constants'
import {
  PAGE_PALETTE_SOLARIZED_DARK,
  SOLARIZED_PAGE_BG_CSS,
  SOLARIZED_PAGE_FG_CSS,
  type PagePalette,
} from './page-palette'

export interface PageColorPair {
  pageBg: string
  pageFg: string
}

/**
 * Surface / inline 铺底统一引用 preset 变量；切换 palette 时随 `:root` 自动更新。
 */
export const THEME_PAGE_BACKGROUND_CSS = `var(${CSS_VAR_PAGE_BG})` as const

export const THEME_PAGE_FOREGROUND_CSS = `var(${CSS_VAR_PAGE_FG})` as const

/** 边框 / ring / hairline 引用 preset 分隔色。 */
export const THEME_PAGE_BORDER_CSS = `var(${CSS_VAR_PAGE_BORDER})` as const

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
