/**
 * RFC 031 §3.1 / S3：Dynamic 逐规则改色主路径（Rust/WASM modifyColor + stylesheet 覆盖注入）。
 */

import { COLOR_USE_FG, modifyColor as wasmModifyColor } from '@luban-ws/dark-engine'

import {
  buildRecolorInjection,
  colorProfileForPagePalette,
  recolorInlineStylesInDocument,
  ROOT_ATTR,
  ensureStyleElement,
  type PagePalette,
  type ThemeFiltersStateV1,
} from '@luban-ws/dark-shared'

/** WASM 改色引擎是否可用（§3.1 决策树首分支）。 */
export function wasmRecolorAvailable(): boolean {
  try {
    wasmModifyColor(0, 0, 0, COLOR_USE_FG, 0)
    return true
  } catch {
    return false
  }
}

/**
 * 从当前文档可读 stylesheet + 内联 style 生成改色并注入。
 * @returns 是否成功（无可改 stylesheet 且无内联颜色 → false，调用方走采样回退）。
 */
export function paintRecolorPath(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
  doc: Document = document,
): boolean {
  const profile = colorProfileForPagePalette(pagePalette)
  const { elementsRecolored } = recolorInlineStylesInDocument(doc, profile)
  const { overrideCss, cssText } = buildRecolorInjection(doc, themeFilters, profile)
  if (!overrideCss.trim() && elementsRecolored === 0) return false
  doc.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(cssText)
  return true
}
