/**
 * 页面主题 = palette id + 已解析的 page 色 + WASM ColorProfile（RFC 031 §5.1.1）。
 * 内容脚本采样后调用 `resolveThemePalette`，再传入改色 / 铺底 / surface 各层。
 */

import type { PagePalette } from '@change-dark/extension-settings'
import type { RecolorProfileTag } from '@change-dark/dark-engine'
import type { ColorProfile } from './modify-colors'
import {
  colorProfileForPagePalette,
  recolorProfileTagForPagePalette,
} from './recolor-profile'

/** 一次 apply 周期内引擎共享的主题契约。 */
export interface ResolvedThemePalette {
  readonly id: PagePalette
  readonly pageBgCss: string
  readonly pageFgCss: string
  readonly profile: ColorProfile
  readonly wasmTag: RecolorProfileTag
}

export function resolveThemePalette(
  palette: PagePalette,
  pageBgCss: string,
  pageFgCss: string,
): ResolvedThemePalette {
  return {
    id: palette,
    pageBgCss,
    pageFgCss,
    profile: colorProfileForPagePalette(palette),
    wasmTag: recolorProfileTagForPagePalette(palette),
  }
}
