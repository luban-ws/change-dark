/**
 * RFC 031：Dynamic 改色样式注入（stylesheet 覆盖 + 壳层）。
 */

import { ROOT_ATTR, type ThemeFiltersStateV1 } from '@luban-ws/extension-settings'
import { buildRecolorDynamicCss, ensureStyleElement } from '@luban-ws/injected-styles'
import { buildRecolorOverrideStylesheet } from './css-stylesheet'
import { DEFAULT_DARK_PROFILE, type ColorProfile } from './modify-colors'
import { collectReadableStylesheetCssTexts } from './stylesheet-collect'

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

/** 采样铺底 + 改色壳层/覆盖层合并为单条 `<style>` 文本。 */
export function mergeRecolorStyleText(baseCss: string, dynamicCss: string): string {
  const base = baseCss.trim()
  const dynamic = dynamicCss.trim()
  if (base && dynamic) return `${base}\n\n${dynamic}`
  return base || dynamic
}

/** 注入/更新改色 `<style>` 并标记 `ROOT_ATTR`。`baseCss` 为 Dynamic 采样铺底，MO 重建时须保留。 */
export function applyRecolorInjection(
  doc: Document,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  baseCss = '',
): string {
  const { overrideCss, cssText } = buildRecolorInjection(doc, themeFilters, profile)
  doc.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(mergeRecolorStyleText(baseCss, cssText))
  return overrideCss
}
