/**
 * RFC 031 §3 / S3：从 `document.styleSheets` 收集可读 CSS 文本（跨域 sheet 跳过）。
 */

export interface ReadableStylesheetCollectResult {
  /** 每个可读 stylesheet 的 `cssRules` 拼接文本 */
  cssChunks: string[]
  /** 成功读取的 stylesheet 数量 */
  readableSheetCount: number
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
 * 遍历 `doc.styleSheets`；`SecurityError`（跨域 link）跳过该 sheet，不 abort 整页。
 */
export function collectReadableStylesheetCssTexts(
  doc: Document,
): ReadableStylesheetCollectResult {
  const cssChunks: string[] = []
  let readableSheetCount = 0

  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      const cssText = serializeStylesheetCssRules(sheet)
      if (!cssText.trim()) continue
      cssChunks.push(cssText)
      readableSheetCount += 1
    } catch {
      // 跨域 stylesheet：§3.1 部分跨域局限，跳过该 sheet
    }
  }

  return { cssChunks, readableSheetCount }
}

/** 是否存在至少一段非空可读 CSS（RFC 031 §3.1 主路径门槛）。 */
export function hasReadableStylesheetCss(doc: Document): boolean {
  const { cssChunks } = collectReadableStylesheetCssTexts(doc)
  return cssChunks.some((chunk) => chunk.trim().length > 0)
}
