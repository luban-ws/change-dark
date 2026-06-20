/**
 * RFC 031：改写 `box-shadow` 声明内嵌的颜色 token。
 */

import {
  DEFAULT_DARK_PROFILE,
  type ColorProfile,
} from './modify-colors'
import { recolorGradientColorStops } from './background-image-css'

/** 改写 box-shadow 中的色值；非 box-shadow → null。 */
export function recolorBoxShadowDeclaration(
  property: string,
  value: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string | null {
  if (property.trim().toLowerCase() !== 'box-shadow') return null
  return recolorGradientColorStops(value, 'border', profile)
}
