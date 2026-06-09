/**
 * RFC 031：Dynamic 改色样式注入（stylesheet 覆盖 + 壳层）。
 */

import { ROOT_ATTR } from './constants'
import { buildRecolorDynamicCss, ensureStyleElement } from './css'
import { buildRecolorOverrideStylesheet } from './css-stylesheet'
import { DEFAULT_DARK_PROFILE, type ColorProfile } from './modify-colors'
import { collectReadableStylesheetCssTexts } from './stylesheet-collect'
import type { ThemeFiltersStateV1 } from './theme-filters'

export interface RecolorInjectionBuildResult {
  overrideCss: string
  cssText: string
}

/** 从可读 stylesheet 生成覆盖 CSS 与完整注入文本（不写 DOM）。 */
export function buildRecolorInjection(
  doc: Document,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): RecolorInjectionBuildResult {
  const { cssChunks } = collectReadableStylesheetCssTexts(doc)
  const sourceCss = cssChunks.join('\n\n')
  const overrideCss = sourceCss.trim()
    ? buildRecolorOverrideStylesheet(sourceCss, profile)
    : ''
  const cssText = buildRecolorDynamicCss(overrideCss, themeFilters)
  return { overrideCss, cssText }
}

/** 注入/更新改色 `<style>` 并标记 `ROOT_ATTR`。 */
export function applyRecolorInjection(
  doc: Document,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string {
  const { overrideCss, cssText } = buildRecolorInjection(doc, themeFilters, profile)
  doc.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(cssText)
  return overrideCss
}
