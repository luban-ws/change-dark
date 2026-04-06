/**
 * RFC 012：主题模式（Dynamic / Static）；RFC 013 Filter CSS；RFC 014 `filter-plus`。
 */

import {
  THEME_MODE_DYNAMIC,
  THEME_MODE_FILTER_CSS,
  THEME_MODE_FILTER_PLUS,
  THEME_MODE_STATIC,
  type ThemeMode,
} from './constants'

/** 合法模式列表（供测试与校验；与产品 UI 顺序一致：Filter → Filter+ → Dynamic → Static）。 */
export const ALL_THEME_MODES: readonly ThemeMode[] = [
  THEME_MODE_FILTER_CSS,
  THEME_MODE_FILTER_PLUS,
  THEME_MODE_DYNAMIC,
  THEME_MODE_STATIC,
]

/**
 * 从 storage 读回的值解析为 `ThemeMode`；未知或缺失时默认 Filter（CSS 反相）。
 */
export function parseThemeMode(raw: unknown): ThemeMode {
  if (raw === THEME_MODE_STATIC) return THEME_MODE_STATIC
  if (raw === THEME_MODE_FILTER_CSS) return THEME_MODE_FILTER_CSS
  if (raw === THEME_MODE_FILTER_PLUS) return THEME_MODE_FILTER_PLUS
  if (raw === THEME_MODE_DYNAMIC) return THEME_MODE_DYNAMIC
  return THEME_MODE_FILTER_CSS
}
