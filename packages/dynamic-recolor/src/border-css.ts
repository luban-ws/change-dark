/**
 * RFC 031：改写 `border*` 简写声明内嵌的颜色 token（如 `24px solid #fff`）。
 */

import {
  DEFAULT_DARK_PROFILE,
  type ColorProfile,
  type ColorUse,
} from './modify-colors'
import { recolorGradientColorStops } from './background-image-css'

/** 宽 gutter 边框（如 gmp-page 24px）仍与 page-bg 齐平，非装饰线。 */
const GUTTER_BORDER_MIN_PX = 8

function borderShorthandColorUse(value: string): ColorUse {
  const m = /^(\d+(?:\.\d+)?)\s*(px|rem|em)?\s+/i.exec(value.trim())
  if (!m) return 'border'
  const width = parseFloat(m[1]!)
  if (!Number.isFinite(width)) return 'border'
  const unit = (m[2] ?? 'px').toLowerCase()
  const px = unit === 'rem' || unit === 'em' ? width * 16 : width
  return px >= GUTTER_BORDER_MIN_PX ? 'bg' : 'border'
}

/** 含 width/style/color 的 border / outline 简写 longhand。 */
export const BORDER_SHORTHAND_PROPERTIES = new Set([
  'border',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
  'outline',
])

/**
 * 改写 border 简写中的 `#fff` / `rgb(...)` 等色值；非 border 属性 → null。
 */
export function recolorBorderShorthandDeclaration(
  property: string,
  value: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string | null {
  const prop = property.trim().toLowerCase()
  if (!BORDER_SHORTHAND_PROPERTIES.has(prop)) return null
  return recolorGradientColorStops(value, borderShorthandColorUse(value), profile)
}
