/**
 * RFC 016：按 origin 覆盖主题模式与主题滤镜（部分字段）；与全局合并后得到有效配置。
 */

import {
  THEME_MODE_DYNAMIC,
  THEME_MODE_FILTER_CSS,
  THEME_MODE_FILTER_PLUS,
  THEME_MODE_STATIC,
  type ThemeMode,
} from './constants'
import { type PagePalette, parseOptionalPagePalette } from './page-palette'
import {
  type TypographySettingsV1,
  type TypographyStateV1,
  clampTypographySettings,
  parseTypographyPartial,
  typographyStateToSettings,
} from './typography'
import { type ThemeFiltersStateV1, clampThemeFilters } from './theme-filters'

/** 与 `STORAGE_KEY_SITE_OVERRIDES` 顶层 JSON 对齐。 */
export const SITE_OVERRIDES_SCHEMA_VERSION = 1 as const

export interface SiteOverridesStateV1 {
  v: typeof SITE_OVERRIDES_SCHEMA_VERSION
  byOrigin: Record<string, SiteOverrideEntryV1>
}

/** 单站覆盖：未出现的字段继承全局。 */
export interface SiteOverrideEntryV1 {
  themeMode?: ThemeMode
  themeFilters?: Partial<ThemeFiltersStateV1>
  /** RFC 018：与全局 `TypographySettingsV1` 差分。 */
  typography?: Partial<TypographySettingsV1>
  /** 与全局 `PagePalette` 差分。 */
  pagePalette?: PagePalette
}

/**
 * 合法 `ThemeMode` 字面量；未知值返回 `undefined`（不覆盖全局）。
 */
export function parseOptionalThemeMode(raw: unknown): ThemeMode | undefined {
  if (raw === THEME_MODE_DYNAMIC) return THEME_MODE_DYNAMIC
  if (raw === THEME_MODE_STATIC) return THEME_MODE_STATIC
  if (raw === THEME_MODE_FILTER_CSS) return THEME_MODE_FILTER_CSS
  if (raw === THEME_MODE_FILTER_PLUS) return THEME_MODE_FILTER_PLUS
  return undefined
}

function parseThemeFiltersPartial(raw: unknown): Partial<ThemeFiltersStateV1> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const out: Partial<ThemeFiltersStateV1> = {}
  for (const k of ['brightness', 'contrast', 'sepia', 'saturate'] as const) {
    if (typeof o[k] === 'number' && Number.isFinite(o[k])) out[k] = o[k] as number
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function parseSiteOverrideEntry(raw: unknown): SiteOverrideEntryV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: SiteOverrideEntryV1 = {}
  if (o.themeMode !== undefined) {
    const m = parseOptionalThemeMode(o.themeMode)
    if (m !== undefined) out.themeMode = m
  }
  if (o.themeFilters !== undefined) {
    const f = parseThemeFiltersPartial(o.themeFilters)
    if (f) out.themeFilters = f
  }
  if (o.typography !== undefined) {
    const ty = parseTypographyPartial(o.typography)
    if (ty && Object.keys(ty).length > 0) out.typography = ty
  }
  if (o.pagePalette !== undefined) {
    const pp = parseOptionalPagePalette(o.pagePalette)
    if (pp !== undefined) out.pagePalette = pp
  }
  if (Object.keys(out).length === 0) return null
  return out
}

/** 是否无任何覆盖（可删 origin 键）。 */
export function isEmptySiteOverrideEntry(e: SiteOverrideEntryV1): boolean {
  if (e.themeMode !== undefined) return false
  if (e.themeFilters !== undefined && Object.keys(e.themeFilters).length > 0) return false
  if (e.typography !== undefined && Object.keys(e.typography).length > 0) return false
  if (e.pagePalette !== undefined) return false
  return true
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
 * 解析 `change-dark:site-overrides`；非法结构回退空表。
 */
export function parseSiteOverridesState(raw: unknown): SiteOverridesStateV1 {
  if (!raw || typeof raw !== 'object') {
    return { v: SITE_OVERRIDES_SCHEMA_VERSION, byOrigin: {} }
  }
  const o = raw as Record<string, unknown>
  const byOriginRaw = o.byOrigin
  if (!byOriginRaw || typeof byOriginRaw !== 'object') {
    return { v: SITE_OVERRIDES_SCHEMA_VERSION, byOrigin: {} }
  }
  const byOrigin: Record<string, SiteOverrideEntryV1> = {}
  for (const [k, val] of Object.entries(byOriginRaw)) {
    if (!isLikelyHttpOriginKey(k)) continue
    const entry = parseSiteOverrideEntry(val)
    if (entry && !isEmptySiteOverrideEntry(entry)) byOrigin[k] = entry
  }
  return { v: SITE_OVERRIDES_SCHEMA_VERSION, byOrigin }
}

/**
 * 合并全局与单站覆盖，得到注入用有效主题（RFC 008：`off` 在更外层短路，此处不处理）。
 */
export function resolveEffectiveTheme(
  origin: string,
  globalMode: ThemeMode,
  globalFilters: ThemeFiltersStateV1,
  state: SiteOverridesStateV1,
): { themeMode: ThemeMode; themeFilters: ThemeFiltersStateV1 } {
  const entry = state.byOrigin[origin]
  const themeMode = entry?.themeMode ?? globalMode
  const themeFilters = clampThemeFilters({
    ...globalFilters,
    ...(entry?.themeFilters ?? {}),
  })
  return { themeMode, themeFilters }
}

/**
 * 合并全局与单站的网页配色（Dynamic/Static 路径）。
 */
export function resolveEffectivePagePalette(
  origin: string,
  globalPalette: PagePalette,
  state: SiteOverridesStateV1,
): PagePalette {
  const entry = state.byOrigin[origin]
  return entry?.pagePalette ?? globalPalette
}

/**
 * RFC 018：合并全局字体/描边与单站 partial。
 */
export function resolveEffectiveTypography(
  origin: string,
  global: TypographyStateV1,
  state: SiteOverridesStateV1,
): TypographySettingsV1 {
  const g = typographyStateToSettings(global)
  const partial = state.byOrigin[origin]?.typography
  if (!partial || Object.keys(partial).length === 0) return g
  return clampTypographySettings({ ...g, ...partial })
}

/** 与全局比较，仅保留与全局不同的滑块键（用于写入部分覆盖）。 */
export function diffPartialThemeFilters(
  global: ThemeFiltersStateV1,
  current: ThemeFiltersStateV1,
): Partial<ThemeFiltersStateV1> {
  const out: Partial<ThemeFiltersStateV1> = {}
  for (const k of ['brightness', 'contrast', 'sepia', 'saturate'] as const) {
    if (current[k] !== global[k]) out[k] = current[k]
  }
  return out
}
