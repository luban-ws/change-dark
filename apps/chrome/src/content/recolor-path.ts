/**
 * RFC 031 / RFC 032：Dynamic 逐规则改色层（WASM modifyColor + stylesheet 覆盖）。
 * 调用方须先注入采样铺底 CSS，再通过 `baseCss` 合并，避免 `ensureStyleElement` 覆盖暗底。
 */

import {
  applyRecolorInjection,
  buildRecolorInjection,
  colorProfileForPagePalette,
  hasReadableStylesheetCss,
  recolorInlineStylesInDocument,
} from '@luban-ws/dynamic-recolor'
import type { PagePalette, ThemeFiltersStateV1 } from '@luban-ws/extension-settings'

/**
 * 在已有铺底（`baseCss`）之上叠加改色覆盖 + 内联 style 改写。
 * @returns 是否写入 recolor 层（无可读 stylesheet 或无颜色可改 → false，铺底由调用方保留）。
 */
export function paintRecolorPath(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
  doc: Document = document,
  baseCss = '',
): boolean {
  if (!hasReadableStylesheetCss(doc)) {
    return false
  }

  const profile = colorProfileForPagePalette(pagePalette)
  const { elementsRecolored } = recolorInlineStylesInDocument(doc, profile)
  const { overrideCss } = buildRecolorInjection(doc, themeFilters, profile)
  if (!overrideCss.trim() && elementsRecolored === 0) return false
  applyRecolorInjection(doc, themeFilters, profile, baseCss)
  return true
}
