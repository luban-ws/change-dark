/**
 * RFC 031：Dynamic 改色样式注入（stylesheet 覆盖 + 壳层）。
 */

import { ROOT_ATTR, type ThemeFiltersStateV1 } from '@change-dark/extension-settings'
import {
  buildRecolorDynamicCss,
  buildThemePaletteShellCss,
  ensureStyleElement,
} from '@change-dark/injected-styles'
import { buildRecolorOverrideStylesheet } from './css-stylesheet'
import { DEFAULT_DARK_PROFILE, type ColorProfile } from './modify-colors'
import { collectReadableStylesheetCssTexts } from './stylesheet-collect'

export interface RecolorInjectionBuildResult {
  overrideCss: string
  cssText: string
}

/** 从已收集的 CSS 文本生成覆盖层（避免重复遍历 `styleSheets`）。 */
export function buildRecolorInjectionFromSource(
  sourceCss: string,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): RecolorInjectionBuildResult {
  const overrideCss = sourceCss.trim()
    ? buildRecolorOverrideStylesheet(sourceCss, profile)
    : ''
  const cssText = buildRecolorDynamicCss(overrideCss, themeFilters)
  return { overrideCss, cssText }
}

/** 从可读 stylesheet 生成覆盖 CSS 与完整注入文本（不写 DOM）。 */
export function buildRecolorInjection(
  doc: Document,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): RecolorInjectionBuildResult {
  const { cssChunks } = collectReadableStylesheetCssTexts(doc)
  return buildRecolorInjectionFromSource(cssChunks.join('\n\n'), themeFilters, profile)
}

/** 采样铺底 + 改色壳层 + 主题壳（主题壳必须最后，压过 WASM 改色字面量）。 */
export function mergeRecolorStyleText(baseCss: string, dynamicCss: string): string {
  const base = baseCss.trim()
  const dynamic = dynamicCss.trim()
  const themeShell = buildThemePaletteShellCss()
  return [base, dynamic, themeShell].filter(Boolean).join('\n\n')
}

/** 写入已构建的改色层（不再重复收集 stylesheet）。 */
export function applyRecolorInjectionFromBuild(
  doc: Document,
  build: RecolorInjectionBuildResult,
  baseCss = '',
): string {
  doc.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(mergeRecolorStyleText(baseCss, build.cssText))
  return build.overrideCss
}

/** 注入/更新改色 `<style>` 并标记 `ROOT_ATTR`。`baseCss` 为 Dynamic 采样铺底，MO 重建时须保留。 */
export function applyRecolorInjection(
  doc: Document,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  baseCss = '',
): string {
  const build = buildRecolorInjection(doc, themeFilters, profile)
  return applyRecolorInjectionFromBuild(doc, build, baseCss)
}
