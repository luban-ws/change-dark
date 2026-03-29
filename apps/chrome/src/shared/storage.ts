import {
  type GlobalPolicy,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SAMPLING_MAX_MS,
  STORAGE_KEY_SAMPLING_MAX_NODES,
  STORAGE_KEY_SCHEMA_VERSION,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_THEME_FILTERS,
} from './constants'
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  shouldInjectForcedDarkStyles,
  resolvePolicyFromSnapshot,
} from './migration'
import {
  type SamplingBudget,
  resolveSamplingBudgetFromSnapshot,
} from './sampling-budget'
import {
  type SiteListStateV1,
  isOriginInDenylist,
  parseSiteListState,
  toggleDenylistOrigin,
} from './site-list'
import {
  type ThemeFiltersStateV1,
  clampThemeFilters,
  parseThemeFiltersState,
} from './theme-filters'

const READ_KEYS = [STORAGE_KEY_SCHEMA_VERSION, STORAGE_KEY_POLICY, STORAGE_KEY_ENABLED] as const

const SAMPLING_KEYS = [STORAGE_KEY_SAMPLING_MAX_NODES, STORAGE_KEY_SAMPLING_MAX_MS] as const

const SITE_LIST_KEYS = [STORAGE_KEY_SITE_LIST] as const

const THEME_FILTER_KEYS = [STORAGE_KEY_THEME_FILTERS] as const

/**
 * 读取当前全局策略（合并遗留 boolean，不写盘）。
 */
export async function readGlobalPolicy(): Promise<GlobalPolicy> {
  const snap = await chrome.storage.local.get([...READ_KEYS])
  return resolvePolicyFromSnapshot(snap as Record<string, unknown>)
}

/**
 * 是否对当前标签页应用强制暗色（由策略推导）。
 */
export async function readApplyDark(): Promise<boolean> {
  const policy = await readGlobalPolicy()
  return shouldInjectForcedDarkStyles(policy)
}

/**
 * 内容脚本专用：全局策略允许 **且** 当前页 `origin` 不在 denylist 时才为 true。
 */
export async function readShouldApplyForcedDarkForPage(pageOrigin?: string): Promise<boolean> {
  const base = await readApplyDark()
  if (!base) return false
  const origin =
    pageOrigin ?? (typeof globalThis.location !== 'undefined' ? globalThis.location.origin : '')
  const state = await readSiteListState()
  return !isOriginInDenylist(origin, state)
}

/**
 * 读取站点列表（RFC 009 / 017 模型子集）。
 */
export async function readSiteListState(): Promise<SiteListStateV1> {
  const snap = await chrome.storage.local.get([...SITE_LIST_KEYS])
  return parseSiteListState(snap[STORAGE_KEY_SITE_LIST])
}

/** 持久化站点列表。 */
export async function persistSiteListState(state: SiteListStateV1): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_SITE_LIST]: state })
}

/** 将某 http(s) origin 在 denylist 中切换（Popup / 快捷键 RFC 010 复用）。 */
export async function toggleCurrentOriginInDenylist(origin: string): Promise<void> {
  const cur = await readSiteListState()
  const next = toggleDenylistOrigin(origin, cur)
  await persistSiteListState(next)
}

/**
 * @deprecated 使用 `readApplyDark`；保留别名以免外部引用断裂。
 */
export const readEnabled = readApplyDark

/**
 * RFC 006：读取采样预算（未写入 storage 时使用默认值）。
 */
export async function readSamplingBudget(): Promise<SamplingBudget> {
  const snap = await chrome.storage.local.get([...SAMPLING_KEYS])
  return resolveSamplingBudgetFromSnapshot(snap as Record<string, unknown>)
}

/**
 * Popup / Options 写入全局策略（RFC 004 / 007）；与迁移后的键一致并移除遗留 `enabled`。
 */
export async function persistGlobalPolicy(policy: GlobalPolicy): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY_POLICY]: policy,
    [STORAGE_KEY_SCHEMA_VERSION]: CURRENT_STORAGE_SCHEMA_VERSION,
  })
  await chrome.storage.local.remove(STORAGE_KEY_ENABLED)
}

/** RFC 011：读取全局主题滤镜。 */
export async function readThemeFiltersState(): Promise<ThemeFiltersStateV1> {
  const snap = await chrome.storage.local.get([...THEME_FILTER_KEYS])
  return parseThemeFiltersState(snap[STORAGE_KEY_THEME_FILTERS])
}

/** RFC 011：写入全局主题滤镜（Popup 滑块）。 */
export async function persistThemeFiltersState(state: ThemeFiltersStateV1): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY_THEME_FILTERS]: clampThemeFilters(state),
  })
}
