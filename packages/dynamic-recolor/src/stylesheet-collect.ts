/**
 * RFC 0031 §3 / S3 & RFC 0037：从 `StyleRoot`（`Document | ShadowRoot`）收集可读 CSS 文本
 * 与 `adoptedStyleSheets`（跨域/不可读 sheet 隔离跳过，扩展自身注入样式排除）。
 */

import {
  STYLE_ELEMENT_CUSTOM_CSS_ID,
  STYLE_ELEMENT_ID,
  STYLE_ELEMENT_TYPOGRAPHY_ID,
} from '@change-dark/extension-settings'

export type StyleRoot = Document | ShadowRoot

export const SHADOW_STYLE_OWNED_ATTR = 'data-change-dark-owned' as const

export interface ReadableStylesheetCollectResult {
  /** 每个可读 stylesheet 的 `cssRules` 拼接文本 */
  cssChunks: string[]
  /** 成功读取到非空规则的 stylesheet 数量 */
  readableSheetCount: number
  /** 本次收集读取到的可访问 adoptedStyleSheets（按对象身份去重，含空构造表） */
  adoptedSheets: CSSStyleSheet[]
  /** 读取失败（跨域 SecurityError 等）被跳过的 sheet 数量 */
  failedSheetCount: number
}

function isExtensionOwnedStylesheet(sheet: CSSStyleSheet): boolean {
  const owner = sheet.ownerNode
  if (!owner || typeof Element === 'undefined' || !(owner instanceof Element)) {
    return false
  }
  const id = owner.id
  if (
    id === STYLE_ELEMENT_ID ||
    id === STYLE_ELEMENT_CUSTOM_CSS_ID ||
    id === STYLE_ELEMENT_TYPOGRAPHY_ID
  ) {
    return true
  }
  return owner.hasAttribute(SHADOW_STYLE_OWNED_ATTR)
}

/** 序列化单张 stylesheet 的 `cssRules`（浏览器 API）。 */
export function serializeStylesheetCssRules(sheet: CSSStyleSheet): string {
  const rules = sheet.cssRules
  if (!rules || rules.length === 0) return ''
  const parts: string[] = []
  for (let i = 0; i < rules.length; i += 1) {
    parts.push(rules[i]!.cssText)
  }
  return parts.join('\n')
}

/**
 * 遍历 `root.styleSheets` 与 `root.adoptedStyleSheets`；
 * `SecurityError`（跨域 link）隔离跳过，扩展自有注入节点排除，同一 sheet 按对象身份去重。
 */
export function collectReadableStylesheetCssTexts(
  root: StyleRoot,
): ReadableStylesheetCollectResult {
  const cssChunks: string[] = []
  let readableSheetCount = 0
  let failedSheetCount = 0
  const seen = new Set<CSSStyleSheet>()
  const adoptedSheets: CSSStyleSheet[] = []
  const seenAdopted = new Set<CSSStyleSheet>()

  for (const sheet of Array.from(root.styleSheets ?? [])) {
    if (!sheet || seen.has(sheet) || isExtensionOwnedStylesheet(sheet)) continue
    seen.add(sheet)
    try {
      const cssText = serializeStylesheetCssRules(sheet)
      if (!cssText.trim()) continue
      cssChunks.push(cssText)
      readableSheetCount += 1
    } catch {
      // 跨域 stylesheet：§3.1 / 0037 部分跨域局限，隔离跳过该 sheet
      failedSheetCount += 1
    }
  }

  let rawAdopted: CSSStyleSheet[] = []
  try {
    rawAdopted = Array.from(root.adoptedStyleSheets ?? [])
  } catch {
    rawAdopted = []
  }

  for (const sheet of rawAdopted) {
    if (!sheet) continue
    if (!seenAdopted.has(sheet)) {
      seenAdopted.add(sheet)
      adoptedSheets.push(sheet)
    }
    if (seen.has(sheet) || isExtensionOwnedStylesheet(sheet)) continue
    seen.add(sheet)
    try {
      const cssText = serializeStylesheetCssRules(sheet)
      if (!cssText.trim()) continue
      cssChunks.push(cssText)
      readableSheetCount += 1
    } catch {
      failedSheetCount += 1
    }
  }

  return { cssChunks, readableSheetCount, adoptedSheets, failedSheetCount }
}

/** 是否存在至少一段非空可读 CSS（RFC 0031 §3.1 / RFC 0037 门槛）。 */
export function hasReadableStylesheetCss(root: StyleRoot): boolean {
  const { cssChunks } = collectReadableStylesheetCssTexts(root)
  return cssChunks.some((chunk) => chunk.trim().length > 0)
}
