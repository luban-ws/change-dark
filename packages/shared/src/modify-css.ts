/**
 * RFC 031 §3.3 / S1：`modify-css` 层 — 把 CSS 声明中的颜色 token 改写为暗色等价。
 *
 * S1 范围：单条内联声明（如 `color: #000`）→ `modifyColor` → 新色值。
 * S2+ 再扩到整段 stylesheet 规则收集与覆盖注入。
 */

import { formatRgbHex, parseCssColorToken } from './color-parse'
import {
  DEFAULT_DARK_PROFILE,
  modifyColor,
  type ColorProfile,
  type ColorUse,
} from './modify-colors'

/** RFC 031 §2.6：Phase 1 直接支持的 longhand 属性 → 色用途。 */
export const RECOLOR_LONGHAND_PROPERTIES: Readonly<Record<string, ColorUse>> = {
  'background-color': 'bg',
  color: 'fg',
  'caret-color': 'fg',
  'border-color': 'border',
  'outline-color': 'border',
  'column-rule-color': 'border',
}

/** 属性名 → 色用途；未知属性返回 null。 */
export function colorUseForCssProperty(property: string): ColorUse | null {
  return RECOLOR_LONGHAND_PROPERTIES[property.trim().toLowerCase()] ?? null
}

/** 从 `style` 属性字符串读取某 longhand 的值（不含 `!important`）。 */
export function readInlineStyleProperty(
  styleAttr: string,
  property: string,
): string | null {
  const key = property.trim().toLowerCase()
  for (const part of styleAttr
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const colon = part.indexOf(':')
    if (colon < 0) continue
    if (part.slice(0, colon).trim().toLowerCase() !== key) continue
    return part
      .slice(colon + 1)
      .trim()
      .replace(/\s*!important\s*$/i, '')
      .trim()
  }
  return null
}

/**
 * 改写单个颜色值字符串（不改属性名）。
 * 非颜色 token / 无法解析 → null（调用方保留原值）。
 */
export function recolorCssColorValue(
  value: string,
  use: ColorUse,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string | null {
  const rgb = parseCssColorToken(value)
  if (!rgb) return null
  return formatRgbHex(modifyColor(rgb, use, profile))
}

/**
 * S1：改写单条内联声明（property + value）。
 * 非改色属性或值不可解析 → null。
 */
export function recolorInlineDeclaration(
  property: string,
  value: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string | null {
  const use = colorUseForCssProperty(property)
  if (!use) return null
  return recolorCssColorValue(value, use, profile)
}

/**
 * S1：改写 `style` 属性字符串内所有可识别的颜色 longhand。
 * 例：`color:#000` → `color: #e8e6e3`（具体值由 profile + modifyColor 决定）。
 */
export function recolorInlineStyleAttribute(
  styleAttr: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string {
  const parts = styleAttr
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  return parts
    .map((part) => {
      const colon = part.indexOf(':')
      if (colon < 0) return part
      const prop = part.slice(0, colon).trim()
      const val = part.slice(colon + 1).trim()
      const recolored = recolorInlineDeclaration(prop, val, profile)
      if (recolored == null) return part
      return `${prop}: ${recolored}`
    })
    .join('; ')
}
