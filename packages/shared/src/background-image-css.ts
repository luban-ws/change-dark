/**
 * RFC 031 P1-5：从 CSS `background` / `background-image` 提取位图 URL 与渐变改色。
 */

import {
  DEFAULT_DARK_PROFILE,
  type ColorProfile,
  type ColorUse,
} from './modify-colors'
import { recolorCssColorValue } from './modify-css'

const CSS_COLOR_TOKEN =
  /#(?:[0-9a-f]{3,8})\b|rgba?\(\s*[\d.%]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+(?:\s*,\s*[\d.]+%?)?\s*\)/gi

const GRADIENT_FN =
  /\b(?:linear|radial|conic|repeating-linear|repeating-radial)-gradient\s*\(/i

/** 从声明值中提取 `url(...)` 资源（不含引号/空白）。 */
export function extractCssBackgroundImageUrls(value: string): string[] {
  const urls: string[] = []
  const re = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    const u = m[2]?.trim()
    if (u) urls.push(u)
  }
  return urls
}

/** 是否含 CSS 渐变函数。 */
export function isCssGradientBackground(value: string): boolean {
  return GRADIENT_FN.test(value)
}

/** 是否含位图 `url(...)`（含 `background` 简写与 `background-image`）。 */
export function hasBitmapBackgroundImage(value: string): boolean {
  return extractCssBackgroundImageUrls(value).length > 0
}

/** 改写渐变/简写中的颜色 token（§2.6 渐变色标走 bg 曲线）。 */
export function recolorGradientColorStops(
  value: string,
  use: ColorUse = 'bg',
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string | null {
  let changed = false
  const next = value.replace(CSS_COLOR_TOKEN, (token) => {
    const recolored = recolorCssColorValue(token, use, profile)
    if (recolored == null) return token
    changed = true
    return recolored
  })
  return changed ? next : null
}

/** `background` / `background-image` 声明改写：渐变改色；位图 url 留运行时亮度滤镜。 */
export function recolorBackgroundImageDeclaration(
  property: string,
  value: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string | null {
  const prop = property.trim().toLowerCase()
  if (prop !== 'background' && prop !== 'background-image') return null
  if (hasBitmapBackgroundImage(value)) return null
  if (isCssGradientBackground(value)) {
    return recolorGradientColorStops(value, 'bg', profile)
  }
  const solid = recolorCssColorValue(value.trim(), 'bg', profile)
  return solid
}
