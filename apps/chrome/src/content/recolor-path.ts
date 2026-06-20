/**
 * RFC 031 / RFC 032：Dynamic 逐规则改色层（WASM modifyColor + stylesheet 覆盖）。
 */

import {
  applyRecolorInjectionFromBuild,
  buildRecolorInjectionFromSource,
  collectReadableStylesheetCssTexts,
  recolorInlineStylesInDocument,
  type ResolvedThemePalette,
} from '@change-dark/dynamic-recolor'
import type { ThemeFiltersStateV1 } from '@change-dark/extension-settings'

/**
 * 仅 stylesheet 覆盖（同步首屏路径；`theme.profile` 含 Solarized preset）。
 */
export function paintRecolorStylesheetPath(
  themeFilters: ThemeFiltersStateV1,
  theme: ResolvedThemePalette,
  doc: Document = document,
  baseCss = '',
): boolean {
  const { cssChunks } = collectReadableStylesheetCssTexts(doc)
  const sourceCss = cssChunks.join('\n\n').trim()
  if (!sourceCss) return false

  const build = buildRecolorInjectionFromSource(sourceCss, themeFilters, theme.profile)
  if (!build.overrideCss.trim()) return false
  applyRecolorInjectionFromBuild(doc, build, baseCss)
  return true
}

/** 内联 `[style]` 改色（idle 分片；须已有可读 stylesheet 才执行，与 DR 门槛一致）。 */
export function paintRecolorInlinePath(
  theme: ResolvedThemePalette,
  doc: Document = document,
): number {
  const { cssChunks } = collectReadableStylesheetCssTexts(doc)
  if (!cssChunks.some((c) => c.trim())) return 0
  return recolorInlineStylesInDocument(doc, theme.profile).elementsRecolored
}

/**
 * 完整改色：stylesheet + 内联（MO / retry 用）。
 */
export function paintRecolorPath(
  themeFilters: ThemeFiltersStateV1,
  theme: ResolvedThemePalette,
  doc: Document = document,
  baseCss = '',
): boolean {
  const { cssChunks } = collectReadableStylesheetCssTexts(doc)
  const sourceCss = cssChunks.join('\n\n').trim()
  if (!sourceCss) return false

  const { elementsRecolored } = recolorInlineStylesInDocument(doc, theme.profile)
  const build = buildRecolorInjectionFromSource(sourceCss, themeFilters, theme.profile)
  if (!build.overrideCss.trim() && elementsRecolored === 0) return false
  applyRecolorInjectionFromBuild(doc, build, baseCss)
  return true
}
