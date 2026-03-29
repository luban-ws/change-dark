/**
 * RFC 009 / 017：站点列表（精确 origin、glob、斜杠正则）与两种语义：列表内不套用 / 仅列表内套用。
 */

import {
  SITE_LIST_MODE_INVERT_LISTED_ONLY,
  SITE_LIST_MODE_NOT_INVERT_LISTED,
  type SiteListMode,
} from './constants'

/** 当前存储形状（RFC 017 v2）。 */
export interface SiteListStateV2 {
  v: 2
  mode: SiteListMode
  /** 规则行：完整 origin、hostname、glob（段内 `*`）、或 `/pattern/flags`。 */
  entries: string[]
}

/** @deprecated 使用 `SiteListStateV2` */
export type SiteListStateV1 = { denylist: string[] }

const MAX_SITE_RULE_LEN = 512 as const
const MAX_REGEX_BODY_LEN = 256 as const

/** 单表最大条数（缓解存储膨胀，RFC 017）。 */
export const MAX_SITE_LIST_ENTRIES = 200 as const

function originToHostname(origin: string): string {
  try {
    return new URL(origin).hostname
  } catch {
    return ''
  }
}

function tryParseSlashRegex(rule: string): { body: string; flags: string } | null {
  if (!rule.startsWith('/') || rule.length < 4) return null
  const endSlash = rule.lastIndexOf('/')
  if (endSlash <= 0) return null
  const body = rule.slice(1, endSlash)
  const flags = rule.slice(endSlash + 1)
  if (body.length === 0 || body.length > MAX_REGEX_BODY_LEN) return null
  if (!/^[gimsuy]*$/.test(flags)) return null
  try {
    new RegExp(body, flags)
  } catch {
    return null
  }
  return { body, flags }
}

/**
 * 段内 `*` 与 hostname 分段对齐（如 `*.google.com`、`google.*`）。
 */
export function globMatchHostname(pattern: string, hostname: string): boolean {
  const ps = pattern.split('.')
  const hs = hostname.split('.')
  if (ps.length !== hs.length) return false
  for (let i = 0; i < ps.length; i++) {
    if (ps[i] === '*') continue
    if (ps[i] !== hs[i]) return false
  }
  return true
}

/**
 * 单条规则是否命中当前页（纯函数，供单测与注入决策）。
 */
export function matchesSiteRule(rule: string, origin: string, hostname: string): boolean {
  if (rule.length > MAX_SITE_RULE_LEN) return false
  if (rule === origin) return true
  if (rule === hostname) return true
  const rx = tryParseSlashRegex(rule)
  if (rx) {
    try {
      const re = new RegExp(rx.body, rx.flags)
      return re.test(hostname) || re.test(origin)
    } catch {
      return false
    }
  }
  if (rule.includes('*')) {
    return globMatchHostname(rule, hostname)
  }
  return false
}

/** 任一规则命中。 */
export function siteListRulesMatch(origin: string, hostname: string, entries: readonly string[]): boolean {
  return entries.some((rule) => matchesSiteRule(rule, origin, hostname))
}

/**
 * 站点列表语义下是否应对该 origin 套用强制暗色（不含全局 policy）。
 */
export function shouldApplyForcedDarkFromSiteList(origin: string, state: SiteListStateV2): boolean {
  const hostname = originToHostname(origin)
  const listed = siteListRulesMatch(origin, hostname, state.entries)
  if (state.mode === SITE_LIST_MODE_NOT_INVERT_LISTED) {
    return !listed
  }
  return listed
}

function normalizeEntryStrings(arr: unknown[]): string[] {
  const out = [
    ...new Set(
      arr
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
    .sort()
    .slice(0, MAX_SITE_LIST_ENTRIES)
  return out
}

/**
 * 解析 storage；遗留 `{ denylist }` 迁移为 `not-invert-listed` + `entries`。
 */
export function parseSiteListState(raw: unknown): SiteListStateV2 {
  if (!raw || typeof raw !== 'object') {
    return { v: 2, mode: SITE_LIST_MODE_NOT_INVERT_LISTED, entries: [] }
  }
  const o = raw as Record<string, unknown>
  const mode: SiteListMode =
    o.mode === SITE_LIST_MODE_INVERT_LISTED_ONLY
      ? SITE_LIST_MODE_INVERT_LISTED_ONLY
      : SITE_LIST_MODE_NOT_INVERT_LISTED

  if (o.v === 2 && Array.isArray(o.entries)) {
    return { v: 2, mode, entries: normalizeEntryStrings(o.entries) }
  }
  const d = o.denylist
  if (Array.isArray(d)) {
    return {
      v: 2,
      mode: SITE_LIST_MODE_NOT_INVERT_LISTED,
      entries: normalizeEntryStrings(d),
    }
  }
  return { v: 2, mode: SITE_LIST_MODE_NOT_INVERT_LISTED, entries: [] }
}

/**
 * @deprecated 使用 `shouldApplyForcedDarkFromSiteList(origin, state)` 取反
 */
export function isOriginInDenylist(origin: string, state: SiteListStateV2): boolean {
  return !shouldApplyForcedDarkFromSiteList(origin, state)
}

/** 切换精确 `origin` 是否在 `entries` 中（快捷键 / Popup 按钮）。 */
export function toggleDenylistOrigin(origin: string, state: SiteListStateV2): SiteListStateV2 {
  const set = new Set(state.entries)
  if (set.has(origin)) set.delete(origin)
  else set.add(origin)
  return {
    v: 2,
    mode: state.mode,
    entries: [...set].sort().slice(0, MAX_SITE_LIST_ENTRIES),
  }
}

/**
 * 从标签页 URL 得到可用于列表的 `origin`；仅 `http`/`https`。
 */
export function normalizeHttpOriginFromUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.origin
  } catch {
    return null
  }
}
