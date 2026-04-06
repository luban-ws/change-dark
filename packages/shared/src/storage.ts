import {
  type GlobalPolicy,
  type ThemeMode,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SAMPLING_MAX_MS,
  STORAGE_KEY_SAMPLING_MAX_NODES,
  STORAGE_KEY_SCHEMA_VERSION,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_THEME_FILTERS,
  STORAGE_KEY_THEME_MODE,
  STORAGE_KEY_PAGE_PALETTE,
  STORAGE_KEY_TYPOGRAPHY,
  STORAGE_KEY_SITE_CUSTOM_CSS,
  STORAGE_KEY_AUTO_DARK_THRESHOLD,
  DEFAULT_AUTO_DARK_THRESHOLD,
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
  type SiteListStateV2,
  parseSiteListState,
  shouldApplyForcedDarkFromSiteList,
  toggleDenylistOrigin,
} from './site-list'
import {
  type ThemeFiltersStateV1,
  clampThemeFilters,
  parseThemeFiltersState,
} from './theme-filters'
import {
  type SiteOverrideEntryV1,
  type SiteOverridesStateV1,
  diffPartialThemeFilters,
  isEmptySiteOverrideEntry,
  parseSiteOverridesState,
  resolveEffectivePagePalette,
  resolveEffectiveTheme,
  resolveEffectiveTypography,
} from './site-overrides'
import { type PagePalette, parsePagePalette } from './page-palette'
import { parseThemeMode } from './theme-mode'
import {
  type TypographySettingsV1,
  type TypographyStateV1,
  TYPOGRAPHY_SCHEMA_VERSION,
  clampTypographySettings,
  DEFAULT_TYPOGRAPHY_STATE,
  diffPartialTypography,
  parseTypographyState,
  typographyStateToSettings,
} from './typography'
import {
  type SiteCustomCssStateV1,
  parseSiteCustomCssState,
  sanitizeSiteCustomCss,
} from './site-custom-css'

const READ_KEYS = [STORAGE_KEY_SCHEMA_VERSION, STORAGE_KEY_POLICY, STORAGE_KEY_ENABLED] as const

const SAMPLING_KEYS = [STORAGE_KEY_SAMPLING_MAX_NODES, STORAGE_KEY_SAMPLING_MAX_MS] as const

const SITE_LIST_KEYS = [STORAGE_KEY_SITE_LIST] as const

const THEME_FILTER_KEYS = [STORAGE_KEY_THEME_FILTERS] as const

const THEME_MODE_KEYS = [STORAGE_KEY_THEME_MODE] as const

const PAGE_PALETTE_KEYS = [STORAGE_KEY_PAGE_PALETTE] as const

const SITE_OVERRIDE_KEYS = [STORAGE_KEY_SITE_OVERRIDES] as const

const TYPOGRAPHY_KEYS = [STORAGE_KEY_TYPOGRAPHY] as const

const SITE_CUSTOM_CSS_KEYS = [STORAGE_KEY_SITE_CUSTOM_CSS] as const

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
 * 内容脚本专用：全局策略允许 **且** 站点列表规则允许套用时才为 true（RFC 017）。
 */
export async function readShouldApplyForcedDarkForPage(pageOrigin?: string): Promise<boolean> {
  const base = await readApplyDark()
  if (!base) return false
  const origin =
    pageOrigin ?? (typeof globalThis.location !== 'undefined' ? globalThis.location.origin : '')
  const state = await readSiteListState()
  return shouldApplyForcedDarkFromSiteList(origin, state)
}

/**
 * 读取站点列表（RFC 009 / 017 模型子集）。
 */
export async function readSiteListState(): Promise<SiteListStateV2> {
  const snap = await chrome.storage.local.get([...SITE_LIST_KEYS])
  return parseSiteListState(snap[STORAGE_KEY_SITE_LIST])
}

/** 持久化站点列表（RFC 017：`v:2` + `mode` + `entries`）。 */
export async function persistSiteListState(state: SiteListStateV2): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_SITE_LIST]: state })
}

/** 将某 http(s) origin 在站点列表 `entries` 中切换（保持当前 `mode`；Popup / 快捷键 RFC 010）。 */
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

/** RFC 012 / 013：当前主题模式（未写入时由 `parseThemeMode` 默认为 Filter / `filter-css`）。 */
export async function readThemeMode(): Promise<ThemeMode> {
  const snap = await chrome.storage.local.get([...THEME_MODE_KEYS])
  return parseThemeMode(snap[STORAGE_KEY_THEME_MODE])
}

/** RFC 012：Popup 单选写入主题模式；切换后内容脚本重绘以清除互斥路径残留。 */
export async function persistThemeMode(mode: ThemeMode): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_THEME_MODE]: mode })
}

/** 网页配色：默认 `dark`（WASM）；可选 Solarized Dark 固定色。 */
export async function readPagePalette(): Promise<PagePalette> {
  const snap = await chrome.storage.local.get([...PAGE_PALETTE_KEYS])
  return parsePagePalette(snap[STORAGE_KEY_PAGE_PALETTE])
}

export async function persistPagePalette(p: PagePalette): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_PAGE_PALETTE]: p })
}

/** RFC 016：读取站点覆盖表。 */
export async function readSiteOverridesState(): Promise<SiteOverridesStateV1> {
  const snap = await chrome.storage.local.get([...SITE_OVERRIDE_KEYS])
  return parseSiteOverridesState(snap[STORAGE_KEY_SITE_OVERRIDES])
}

/** RFC 016：写入整表（内部使用）。 */
export async function persistSiteOverridesState(state: SiteOverridesStateV1): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_SITE_OVERRIDES]: state })
}

/** RFC 018：读取全局字体/描边。 */
export async function readTypographyState(): Promise<TypographyStateV1> {
  const snap = await chrome.storage.local.get([...TYPOGRAPHY_KEYS])
  return parseTypographyState(snap[STORAGE_KEY_TYPOGRAPHY])
}

/** RFC 018：写入全局字体/描边（Popup）。 */
export async function persistTypographyState(state: TypographyStateV1): Promise<void> {
  const c = clampTypographySettings(
    typographyStateToSettings({ ...DEFAULT_TYPOGRAPHY_STATE, ...state }),
  )
  await chrome.storage.local.set({
    [STORAGE_KEY_TYPOGRAPHY]: { v: TYPOGRAPHY_SCHEMA_VERSION, ...c },
  })
}

/** RFC 019：读取每站自定义 CSS 表。 */
export async function readSiteCustomCssState(): Promise<SiteCustomCssStateV1> {
  const snap = await chrome.storage.local.get([...SITE_CUSTOM_CSS_KEYS])
  return parseSiteCustomCssState(snap[STORAGE_KEY_SITE_CUSTOM_CSS])
}

/** RFC 019：写入整表（内部使用）。 */
export async function persistSiteCustomCssState(state: SiteCustomCssStateV1): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_SITE_CUSTOM_CSS]: state })
}

/**
 * RFC 019：当前页 origin 的用户 CSS（已 sanitize）；无则为空串。
 */
export async function readSiteCustomCssForPage(pageOrigin?: string): Promise<string> {
  const origin =
    pageOrigin ?? (typeof globalThis.location !== 'undefined' ? globalThis.location.origin : '')
  const state = await readSiteCustomCssState()
  return state.byOrigin[origin]?.css ?? ''
}

/** RFC 019：写入或清空某 origin 的自定义 CSS（Popup）。 */
export async function persistSiteCustomCssForOrigin(origin: string, css: string): Promise<void> {
  const cur = await readSiteCustomCssState()
  const byOrigin = { ...cur.byOrigin }
  const s = sanitizeSiteCustomCss(css)
  if (!s.trim()) {
    delete byOrigin[origin]
  } else {
    byOrigin[origin] = { css: s }
  }
  await persistSiteCustomCssState({ v: 1, byOrigin })
}

/** RFC 016 / 019：是否存在该 origin 的主题/字体覆盖或自定义 CSS。 */
export async function hasSiteScopedDataForOrigin(origin: string): Promise<boolean> {
  const [ov, cssText] = await Promise.all([
    readSiteOverridesState(),
    readSiteCustomCssForPage(origin),
  ])
  return Boolean(ov.byOrigin[origin]) || cssText.trim().length > 0
}

/**
 * RFC 016：按当前页 origin 合并全局主题与覆盖，供内容脚本注入。
 */
export async function readEffectiveThemeForPage(pageOrigin?: string): Promise<{
  themeMode: ThemeMode
  themeFilters: ThemeFiltersStateV1
}> {
  const origin =
    pageOrigin ?? (typeof globalThis.location !== 'undefined' ? globalThis.location.origin : '')
  const [globalMode, globalFilters, overrides] = await Promise.all([
    readThemeMode(),
    readThemeFiltersState(),
    readSiteOverridesState(),
  ])
  return resolveEffectiveTheme(origin, globalMode, globalFilters, overrides)
}

/**
 * 按当前页 origin 合并全局网页配色与单站覆盖（Dynamic/Static）。
 */
export async function readEffectivePagePaletteForPage(pageOrigin?: string): Promise<PagePalette> {
  const origin =
    pageOrigin ?? (typeof globalThis.location !== 'undefined' ? globalThis.location.origin : '')
  const [globalPalette, overrides] = await Promise.all([
    readPagePalette(),
    readSiteOverridesState(),
  ])
  return resolveEffectivePagePalette(origin, globalPalette, overrides)
}

/**
 * RFC 018：按当前页合并全局与单站字体/描边。
 */
export async function readEffectiveTypographyForPage(pageOrigin?: string): Promise<TypographySettingsV1> {
  const origin =
    pageOrigin ?? (typeof globalThis.location !== 'undefined' ? globalThis.location.origin : '')
  const [globalTy, overrides] = await Promise.all([
    readTypographyState(),
    readSiteOverridesState(),
  ])
  return resolveEffectiveTypography(origin, globalTy, overrides)
}

async function persistSiteOverrideEntry(
  origin: string,
  next: SiteOverrideEntryV1,
  stateHint?: SiteOverridesStateV1,
): Promise<void> {
  const cur = stateHint ?? (await readSiteOverridesState())
  const byOrigin = { ...cur.byOrigin }
  if (isEmptySiteOverrideEntry(next)) {
    delete byOrigin[origin]
  } else {
    byOrigin[origin] = next
  }
  await persistSiteOverridesState({ v: 1, byOrigin })
}

/** RFC 016 Popup：仅当前站覆盖模式；与全局相同时去掉该字段。 */
export async function upsertSiteThemeModeOverride(origin: string, mode: ThemeMode): Promise<void> {
  const globalMode = await readThemeMode()
  const state = await readSiteOverridesState()
  const prev = state.byOrigin[origin] ?? {}
  const next: SiteOverrideEntryV1 = { ...prev }
  if (mode === globalMode) {
    delete next.themeMode
  } else {
    next.themeMode = mode
  }
  await persistSiteOverrideEntry(origin, next, state)
}

/** RFC 016 Popup：写入与全局差分后的滑块部分覆盖。 */
export async function upsertSiteThemeFiltersOverride(
  origin: string,
  current: ThemeFiltersStateV1,
): Promise<void> {
  const global = await readThemeFiltersState()
  const partial = diffPartialThemeFilters(global, current)
  const state = await readSiteOverridesState()
  const prev = state.byOrigin[origin] ?? {}
  const next: SiteOverrideEntryV1 = { ...prev }
  if (Object.keys(partial).length === 0) {
    delete next.themeFilters
  } else {
    next.themeFilters = partial
  }
  await persistSiteOverrideEntry(origin, next, state)
}

/** Popup：仅当前站覆盖网页配色；与全局相同时去掉该字段。 */
export async function upsertSitePagePaletteOverride(origin: string, palette: PagePalette): Promise<void> {
  const globalPalette = await readPagePalette()
  const state = await readSiteOverridesState()
  const prev = state.byOrigin[origin] ?? {}
  const next: SiteOverrideEntryV1 = { ...prev }
  if (palette === globalPalette) {
    delete next.pagePalette
  } else {
    next.pagePalette = palette
  }
  await persistSiteOverrideEntry(origin, next, state)
}

/** RFC 018：写入与全局差分后的字体/描边部分覆盖。 */
export async function upsertSiteTypographyOverride(
  origin: string,
  current: TypographySettingsV1,
): Promise<void> {
  const global = typographyStateToSettings(await readTypographyState())
  const partial = diffPartialTypography(global, current)
  const state = await readSiteOverridesState()
  const prev = state.byOrigin[origin] ?? {}
  const next: SiteOverrideEntryV1 = { ...prev }
  if (Object.keys(partial).length === 0) {
    delete next.typography
  } else {
    next.typography = partial
  }
  await persistSiteOverrideEntry(origin, next, state)
}

/** RFC 016 / 019：移除此 origin 的主题/字体覆盖与自定义 CSS。 */
export async function clearSiteOverrideForOrigin(origin: string): Promise<void> {
  const state = await readSiteOverridesState()
  const byOrigin = { ...state.byOrigin }
  delete byOrigin[origin]
  await persistSiteOverridesState({ v: 1, byOrigin })
  const cssCur = await readSiteCustomCssState()
  const cssByOrigin = { ...cssCur.byOrigin }
  delete cssByOrigin[origin]
  await persistSiteCustomCssState({ v: 1, byOrigin: cssByOrigin })
}

/** RFC 024：读取智能暗色检测阈值。 */
export async function readAutoDarkThreshold(): Promise<number> {
  const result = await chrome.storage.local.get(STORAGE_KEY_AUTO_DARK_THRESHOLD)
  const val = result[STORAGE_KEY_AUTO_DARK_THRESHOLD]
  if (typeof val === 'number') return val
  return DEFAULT_AUTO_DARK_THRESHOLD
}

/** RFC 024：持久化智能暗色检测阈值。 */
export async function persistAutoDarkThreshold(val: number): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_AUTO_DARK_THRESHOLD]: val })
}
