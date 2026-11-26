/**
 * RFC 0034：合并多条 profile + 用户 patch → ResolvedSurfaceRepairPolicy。
 */

import {
  DEFAULT_RECOLOR_POLICY,
  DEFAULT_SURFACE_REPAIR_POLICY,
} from './defaults'
import type {
  MergedSitePolicyV1,
  ResolvedSurfaceRepairPolicy,
  SiteProfilePatchV1,
  SiteProfileV1,
  SiteRecolorProfileV1,
  SiteSurfaceRepairProfileV1,
} from './types'

function uniqueStrings(items: readonly string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function appendComponentClassHints(
  baseRe: RegExp,
  extraHints?: readonly string[],
): RegExp {
  if (!extraHints?.length) return baseRe
  const parts = [
    baseRe.source,
    ...extraHints.map((h) => `(?:${h})`),
  ]
  return new RegExp(parts.join('|'), 'i')
}

function mergeSurfaceRepairLayer(
  base: ResolvedSurfaceRepairPolicy,
  patch?: SiteSurfaceRepairProfileV1,
): ResolvedSurfaceRepairPolicy {
  if (!patch) return base

  const landmarkSelectors = patch.landmarkSelectors
    ? uniqueStrings([...base.landmarkSelectors, ...patch.landmarkSelectors])
    : [...base.landmarkSelectors]

  const neverPaintSelectors = patch.neverPaint
    ? uniqueStrings([...base.neverPaintSelectors, ...patch.neverPaint])
    : [...base.neverPaintSelectors]

  return {
    landmarkSelectors,
    landmarkSelectorList: landmarkSelectors.join(', '),
    neverPaintSelectors,
    neverPaintSelectorList: neverPaintSelectors.join(', '),
    componentClassHintRe: appendComponentClassHints(
      base.componentClassHintRe,
      patch.componentClassHints,
    ),
    minPanelAreaPx: patch.minPanelAreaPx ?? base.minPanelAreaPx,
    minPanelWidthPx: patch.minPanelWidthPx ?? base.minPanelWidthPx,
    minPanelHeightPx: patch.minPanelHeightPx ?? base.minPanelHeightPx,
    gutterProbe: patch.gutterProbe ?? base.gutterProbe,
  }
}

function mergeRecolorLayer(
  base: SiteRecolorProfileV1,
  patch?: SiteRecolorProfileV1,
): SiteRecolorProfileV1 {
  if (!patch) return base
  return {
    forceShorthandProperties: patch.forceShorthandProperties
      ? uniqueStrings([
          ...(base.forceShorthandProperties ?? []),
          ...patch.forceShorthandProperties,
        ])
      : base.forceShorthandProperties,
    cssVarSubstitute: {
      ...base.cssVarSubstitute,
      ...patch.cssVarSubstitute,
    },
  }
}

/** 合并 catalog 条目（已排序）+ 可选用户 patch。 */
export function mergeSitePolicies(
  matched: readonly SiteProfileV1[],
  userPatch?: SiteProfilePatchV1,
): MergedSitePolicyV1 {
  let surface = { ...DEFAULT_SURFACE_REPAIR_POLICY }
  let recolor: SiteRecolorProfileV1 = { ...DEFAULT_RECOLOR_POLICY }
  let customCss = ''
  const matchedProfileIds: string[] = []

  if (!userPatch?.disabled) {
    for (const profile of matched) {
      matchedProfileIds.push(profile.id)
    }
    const ascending = matched
      .slice()
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    for (const profile of ascending) {
      surface = mergeSurfaceRepairLayer(surface, profile.surfaceRepair)
      recolor = mergeRecolorLayer(recolor, profile.recolor)
      if (profile.customCss?.trim()) {
        customCss = [customCss, profile.customCss.trim()].filter(Boolean).join('\n')
      }
    }
  }

  if (userPatch) {
    surface = mergeSurfaceRepairLayer(surface, userPatch.surfaceRepair)
    recolor = mergeRecolorLayer(recolor, userPatch.recolor)
    if (userPatch.customCss?.trim()) {
      customCss = [customCss, userPatch.customCss.trim()].filter(Boolean).join('\n')
    }
  }

  return {
    matchedProfileIds,
    surfaceRepair: surface,
    recolor,
    customCss,
  }
}
