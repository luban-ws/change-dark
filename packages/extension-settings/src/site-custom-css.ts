/**
 * RFC 019：每站自定义 CSS 片段（Dev tools 类）；存储与净化，防 `</style>` 逃逸与过大 payload。
 */

export const SITE_CUSTOM_CSS_SCHEMA_VERSION = 1 as const

/** 单条 CSS 最大字符数（缓解 local 膨胀）。 */
export const MAX_SITE_CUSTOM_CSS_CHARS = 16_384 as const

/** 单表最多保留的 origin 条数。 */
export const MAX_SITE_CUSTOM_CSS_ORIGINS = 100 as const

export interface SiteCustomCssEntryV1 {
  css: string
}

export interface SiteCustomCssStateV1 {
  v: typeof SITE_CUSTOM_CSS_SCHEMA_VERSION
  byOrigin: Record<string, SiteCustomCssEntryV1>
}

export const DEFAULT_SITE_CUSTOM_CSS_STATE: SiteCustomCssStateV1 = {
  v: SITE_CUSTOM_CSS_SCHEMA_VERSION,
  byOrigin: {},
}

function isLikelyHttpOriginKey(k: string): boolean {
  try {
    const u = new URL(k)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === k
  } catch {
    return false
  }
}

/**
 * 净化用户粘贴的 CSS：去空字节、截断、去掉可闭合 `<style>` 的片段、去掉常见 `javascript:` 注入。
 * 非完整 CSS 解析器；最终以 `textContent` 写入 `<style>`。
 */
export function sanitizeSiteCustomCss(raw: string): string {
  let s = raw.replace(/\0/g, '')
  s = s.replace(/<\/style/gi, '/* </style */')
  s = s.replace(/javascript\s*:/gi, '')
  if (s.length > MAX_SITE_CUSTOM_CSS_CHARS) {
    s = s.slice(0, MAX_SITE_CUSTOM_CSS_CHARS)
  }
  return s
}

/**
 * 解析 `change-dark:site-custom-css`；非法结构回退空表。
 */
export function parseSiteCustomCssState(raw: unknown): SiteCustomCssStateV1 {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SITE_CUSTOM_CSS_STATE }
  const o = raw as Record<string, unknown>
  if (o.v !== SITE_CUSTOM_CSS_SCHEMA_VERSION) return { ...DEFAULT_SITE_CUSTOM_CSS_STATE }
  const bo = o.byOrigin
  if (!bo || typeof bo !== 'object') return { ...DEFAULT_SITE_CUSTOM_CSS_STATE }
  const byOrigin: Record<string, SiteCustomCssEntryV1> = {}
  let count = 0
  for (const [k, val] of Object.entries(bo)) {
    if (count >= MAX_SITE_CUSTOM_CSS_ORIGINS) break
    if (!isLikelyHttpOriginKey(k)) continue
    if (!val || typeof val !== 'object') continue
    const e = val as Record<string, unknown>
    if (typeof e.css !== 'string') continue
    const css = sanitizeSiteCustomCss(e.css)
    if (css.trim().length > 0) {
      byOrigin[k] = { css }
      count += 1
    }
  }
  return { v: SITE_CUSTOM_CSS_SCHEMA_VERSION, byOrigin }
}

/**
 * 供可选「导入 JSON」校验（schema 与 parse 一致）。
 */
export function isSiteCustomCssStateV1(raw: unknown): raw is SiteCustomCssStateV1 {
  const s = parseSiteCustomCssState(raw)
  return raw !== null && typeof raw === 'object' && (raw as { v?: unknown }).v === SITE_CUSTOM_CSS_SCHEMA_VERSION
}
