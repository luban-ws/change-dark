/**
 * RFC 034：Site Profile Catalog — 类型与 schema 版本。
 */

export const SITE_PROFILE_SCHEMA_VERSION = 1 as const

export type ColorUseKind = 'bg' | 'fg' | 'border'

export interface SiteProfileMatchV1 {
  hostEquals?: string[]
  hostSuffix?: string[]
  pathPrefix?: string[]
}

export interface SiteSurfaceRepairProfileV1 {
  landmarkSelectors?: string[]
  /** 额外 RegExp 源串，合并进 componentClassHintRe */
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

export interface SiteRecolorProfileV1 {
  forceShorthandProperties?: string[]
  cssVarSubstitute?: Record<
    string,
    { use: ColorUseKind; fallback?: string }
  >
}

export interface SiteProfileV1 {
  v: typeof SITE_PROFILE_SCHEMA_VERSION
  id: string
  match: SiteProfileMatchV1
  priority?: number
  surfaceRepair?: SiteSurfaceRepairProfileV1
  recolor?: SiteRecolorProfileV1
  /** 最后手段；运行时经 RFC 019 sanitize */
  customCss?: string
}

/** 用户 storage 差分；`disabled` 跳过 bundled 匹配项。 */
export interface SiteProfilePatchV1 {
  disabled?: boolean
  surfaceRepair?: Partial<SiteSurfaceRepairProfileV1>
  recolor?: Partial<SiteRecolorProfileV1>
  customCss?: string
}

/** 合并后的 surface 策略（供 L2 消费）。 */
export interface ResolvedSurfaceRepairPolicy {
  landmarkSelectors: readonly string[]
  /** `landmarkSelectors` 预拼接，供 `querySelectorAll` / `matches` 一次调用 */
  landmarkSelectorList: string
  neverPaintSelectors: readonly string[]
  /** `neverPaintSelectors` 预拼接，供 `matches` 一次调用 */
  neverPaintSelectorList: string
  componentClassHintRe: RegExp
  minPanelAreaPx: number
  minPanelWidthPx: number
  minPanelHeightPx: number
  gutterProbe?: {
    mainSelector: string
    insetPx: number
  }
}

export interface MergedSitePolicyV1 {
  /** 命中的 catalog id（调试用） */
  matchedProfileIds: string[]
  surfaceRepair: ResolvedSurfaceRepairPolicy
  recolor: SiteRecolorProfileV1
  customCss: string
}
