/**
 * RFC 034：全局默认 policy（与 RFC 033 surface-heuristics 对齐）。
 */

import {
  CD_SURFACE_LANDMARK_SELECTORS,
  MIN_SIGNIFICANT_SURFACE_AREA_PX,
  MIN_SIGNIFICANT_SURFACE_HEIGHT_PX,
  MIN_SIGNIFICANT_SURFACE_WIDTH_PX,
  SURFACE_COMPONENT_CLASS_HINT_RE,
} from '@change-dark/extension-settings'

import type {
  MergedSitePolicyV1,
  ResolvedSurfaceRepairPolicy,
  SiteRecolorProfileV1,
} from './types'

const DEFAULT_LANDMARKS = CD_SURFACE_LANDMARK_SELECTORS.split(',').map((s) => s.trim())

export const DEFAULT_SURFACE_REPAIR_POLICY: ResolvedSurfaceRepairPolicy = {
  landmarkSelectors: DEFAULT_LANDMARKS,
  landmarkSelectorList: CD_SURFACE_LANDMARK_SELECTORS,
  neverPaintSelectors: [],
  neverPaintSelectorList: '',
  componentClassHintRe: SURFACE_COMPONENT_CLASS_HINT_RE,
  minPanelAreaPx: MIN_SIGNIFICANT_SURFACE_AREA_PX,
  minPanelWidthPx: MIN_SIGNIFICANT_SURFACE_WIDTH_PX,
  minPanelHeightPx: MIN_SIGNIFICANT_SURFACE_HEIGHT_PX,
}

export const DEFAULT_RECOLOR_POLICY: SiteRecolorProfileV1 = {
  forceShorthandProperties: ['border', 'border-left', 'border-right', 'outline', 'box-shadow'],
}

export const GLOBAL_DEFAULT_SITE_POLICY: MergedSitePolicyV1 = {
  matchedProfileIds: [],
  surfaceRepair: DEFAULT_SURFACE_REPAIR_POLICY,
  recolor: DEFAULT_RECOLOR_POLICY,
  customCss: '',
}
