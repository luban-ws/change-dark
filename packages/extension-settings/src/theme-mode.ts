/**
 * 产品仅保留 Dynamic 逐规则改色；`theme-mode` 存储键保留兼容旧数据。
 */

import { THEME_MODE_DYNAMIC, type ThemeMode } from './constants'

/** 唯一合法模式。 */
export const ALL_THEME_MODES: readonly ThemeMode[] = [THEME_MODE_DYNAMIC]

/** 任意 storage 值均解析为 Dynamic。 */
export function parseThemeMode(_raw: unknown): ThemeMode {
  return THEME_MODE_DYNAMIC
}
