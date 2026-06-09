/**
 * RFC 031 §5.1.1：页面调色板 → 改色 ColorProfile / WASM profile 标签。
 */
import type { ColorProfile } from './modify-colors'
import { DEFAULT_DARK_PROFILE, rgbToHsl } from './modify-colors'
import {
  PAGE_PALETTE_SOLARIZED_DARK,
  type PagePalette,
} from '@luban-ws/extension-settings'
import {
  PROFILE_TAG_DARK,
  PROFILE_TAG_SOLARIZED_DARK,
  type RecolorProfileTag,
} from '@luban-ws/dark-engine'

/** Solarized Dark pole（base03 / base1）。 */
export const SOLARIZED_DARK_PROFILE: ColorProfile = {
  id: 'solarized-dark',
  maxBgLightness: DEFAULT_DARK_PROFILE.maxBgLightness,
  minFgLightness: DEFAULT_DARK_PROFILE.minFgLightness,
  poleBg: rgbToHsl({ r: 0, g: 43, b: 54 }),
  poleFg: rgbToHsl({ r: 147, g: 161, b: 161 }),
}

export function colorProfileForPagePalette(palette: PagePalette): ColorProfile {
  return palette === PAGE_PALETTE_SOLARIZED_DARK
    ? SOLARIZED_DARK_PROFILE
    : DEFAULT_DARK_PROFILE
}

export function recolorProfileTagForPagePalette(palette: PagePalette): RecolorProfileTag {
  return palette === PAGE_PALETTE_SOLARIZED_DARK
    ? PROFILE_TAG_SOLARIZED_DARK
    : PROFILE_TAG_DARK
}

export function colorProfileToWasmTag(profile: ColorProfile): RecolorProfileTag {
  return profile.id === 'solarized-dark'
    ? PROFILE_TAG_SOLARIZED_DARK
    : PROFILE_TAG_DARK
}
