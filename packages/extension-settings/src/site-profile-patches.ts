/**
 * RFC 0034：每站 Site Profile 用户差分补丁（storage 结构与校验）。
 * 与 `@change-dark/site-catalog` 中的 `SiteProfilePatchV1` 结构兼容，保持叶包零反向依赖。
 */

export const SITE_PROFILE_PATCHES_SCHEMA_VERSION = 1 as const

export type SiteProfilePatchColorUse = 'bg' | 'fg' | 'border'

export interface SiteProfileSurfaceRepairPatchV1 {
  landmarkSelectors?: string[]
  componentClassHints?: string[]
  neverPaint?: string[]
  minPanelAreaPx?: number
  minPanelWidthPx?: number
  minPanelHeightPx?: number
  gutterProbe?: {
    mainSelector: string
    insetPx: number
  }
}

export interface SiteProfileRecolorPatchV1 {
  forceShorthandProperties?: string[]
  cssVarSubstitute?: Record<
    string,
    { use: SiteProfilePatchColorUse; fallback?: string }
  >
}

export interface StoredSiteProfilePatchV1 {
  disabled?: boolean
  surfaceRepair?: SiteProfileSurfaceRepairPatchV1
  recolor?: SiteProfileRecolorPatchV1
  customCss?: string
}

export interface SiteProfilePatchesStateV1 {
  v: typeof SITE_PROFILE_PATCHES_SCHEMA_VERSION
  byOrigin: Record<string, StoredSiteProfilePatchV1>
}

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
  return out.length > 0 ? out : undefined
}

function parsePositiveNumber(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return undefined
  return raw
}

function parseGutterProbe(
  raw: unknown,
): { mainSelector: string; insetPx: number } | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  if (typeof o.mainSelector !== 'string' || !o.mainSelector.trim()) return undefined
  if (typeof o.insetPx !== 'number' || !Number.isFinite(o.insetPx) || o.insetPx < 0) {
    return undefined
  }
  return { mainSelector: o.mainSelector.trim(), insetPx: o.insetPx }
}

function parseSurfaceRepairPatch(raw: unknown): SiteProfileSurfaceRepairPatchV1 | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const out: SiteProfileSurfaceRepairPatchV1 = {}

  const landmarkSelectors = parseStringArray(o.landmarkSelectors)
  if (landmarkSelectors) out.landmarkSelectors = landmarkSelectors

  const componentClassHints = parseStringArray(o.componentClassHints)
  if (componentClassHints) out.componentClassHints = componentClassHints

  const neverPaint = parseStringArray(o.neverPaint)
  if (neverPaint) out.neverPaint = neverPaint

  const minPanelAreaPx = parsePositiveNumber(o.minPanelAreaPx)
  if (minPanelAreaPx !== undefined) out.minPanelAreaPx = minPanelAreaPx

  const minPanelWidthPx = parsePositiveNumber(o.minPanelWidthPx)
  if (minPanelWidthPx !== undefined) out.minPanelWidthPx = minPanelWidthPx

  const minPanelHeightPx = parsePositiveNumber(o.minPanelHeightPx)
  if (minPanelHeightPx !== undefined) out.minPanelHeightPx = minPanelHeightPx

  const gutterProbe = parseGutterProbe(o.gutterProbe)
  if (gutterProbe) out.gutterProbe = gutterProbe

  return Object.keys(out).length > 0 ? out : undefined
}

function isColorUse(v: unknown): v is SiteProfilePatchColorUse {
  return v === 'bg' || v === 'fg' || v === 'border'
}

function parseCssVarSubstitute(
  raw: unknown,
): Record<string, { use: SiteProfilePatchColorUse; fallback?: string }> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, { use: SiteProfilePatchColorUse; fallback?: string }> = {}
  for (const [varName, entry] of Object.entries(raw as Record<string, unknown>)) {
    const key = varName.trim()
    if (!key.startsWith('--')) continue
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (!isColorUse(e.use)) continue
    const fallback =
      typeof e.fallback === 'string' && e.fallback.trim() ? e.fallback.trim() : undefined
    out[key] = fallback ? { use: e.use, fallback } : { use: e.use }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function parseRecolorPatch(raw: unknown): SiteProfileRecolorPatchV1 | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const out: SiteProfileRecolorPatchV1 = {}

  const forceShorthandProperties = parseStringArray(o.forceShorthandProperties)
  if (forceShorthandProperties) out.forceShorthandProperties = forceShorthandProperties

  const cssVarSubstitute = parseCssVarSubstitute(o.cssVarSubstitute)
  if (cssVarSubstitute) out.cssVarSubstitute = cssVarSubstitute

  return Object.keys(out).length > 0 ? out : undefined
}

export function isValidSiteProfileOriginKey(k: string): boolean {
  try {
    const u = new URL(k)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === k
  } catch {
    return false
  }
}

/** 校验单站 `StoredSiteProfilePatchV1`；空对象或无效结构返回 null。 */
export function parseSiteProfilePatch(raw: unknown): StoredSiteProfilePatchV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: StoredSiteProfilePatchV1 = {}

  if (o.disabled === true) {
    out.disabled = true
  }

  const surfaceRepair = parseSurfaceRepairPatch(o.surfaceRepair)
  if (surfaceRepair) out.surfaceRepair = surfaceRepair

  const recolor = parseRecolorPatch(o.recolor)
  if (recolor) out.recolor = recolor

  if (typeof o.customCss === 'string' && o.customCss.trim()) {
    out.customCss = o.customCss.trim()
  }

  return Object.keys(out).length > 0 ? out : null
}

/** 解析 `change-dark:site-profile-patches`；非法 origin 或空补丁自动剔除。 */
export function parseSiteProfilePatchesState(raw: unknown): SiteProfilePatchesStateV1 {
  if (!raw || typeof raw !== 'object') {
    return { v: SITE_PROFILE_PATCHES_SCHEMA_VERSION, byOrigin: {} }
  }
  const o = raw as Record<string, unknown>
  const byOriginRaw = o.byOrigin
  if (!byOriginRaw || typeof byOriginRaw !== 'object') {
    return { v: SITE_PROFILE_PATCHES_SCHEMA_VERSION, byOrigin: {} }
  }
  const byOrigin: Record<string, StoredSiteProfilePatchV1> = {}
  for (const [k, val] of Object.entries(byOriginRaw as Record<string, unknown>)) {
    if (!isValidSiteProfileOriginKey(k)) continue
    const parsed = parseSiteProfilePatch(val)
    if (parsed) byOrigin[k] = parsed
  }
  return { v: SITE_PROFILE_PATCHES_SCHEMA_VERSION, byOrigin }
}
