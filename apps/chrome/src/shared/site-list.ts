/**
 * RFC 009 / 017：站点列表抽象模型的 v1 子集（仅 `denylist` 精确 origin 匹配）。
 */

/** 与 `STORAGE_KEY_SITE_LIST` 对应的 JSON 形状。 */
export interface SiteListStateV1 {
  /** 不应用强制暗色的页面 `origin`（无 path，见 `normalizeHttpOriginFromUrl`）。 */
  denylist: string[]
}

/**
 * 从标签页 URL 得到可用于列表的 `origin`；仅 `http`/`https`。
 * `chrome://`、`file://` 等返回 `null`（Popup 侧禁用切换）。
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

/**
 * 解析 storage 中的站点列表；非法或缺失时返回空 denylist。
 */
export function parseSiteListState(raw: unknown): SiteListStateV1 {
  if (!raw || typeof raw !== 'object') return { denylist: [] }
  const d = (raw as { denylist?: unknown }).denylist
  if (!Array.isArray(d)) return { denylist: [] }
  const denylist = [
    ...new Set(d.filter((x): x is string => typeof x === 'string' && x.length > 0)),
  ].sort()
  return { denylist }
}

export function isOriginInDenylist(origin: string, state: SiteListStateV1): boolean {
  return state.denylist.includes(origin)
}

/** 切换某 `origin` 是否在 denylist 中，返回新状态（不写盘）。 */
export function toggleDenylistOrigin(origin: string, state: SiteListStateV1): SiteListStateV1 {
  const set = new Set(state.denylist)
  if (set.has(origin)) set.delete(origin)
  else set.add(origin)
  return { denylist: [...set].sort() }
}
