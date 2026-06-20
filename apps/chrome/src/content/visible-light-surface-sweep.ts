/**
 * 可见区域扫描：地标优先 + 启发式 query，覆盖 fold 下 footer / 大白底 section。
 */

import {
  computeDeadlineMs,
  isPastDeadline,
  isSurfaceLandmark,
  type SamplingBudget,
} from '@change-dark/extension-settings'
import type { ResolvedSurfaceRepairPolicy } from '@change-dark/site-catalog'
import { DEFAULT_SURFACE_REPAIR_POLICY } from '@change-dark/site-catalog'

import { getActiveSitePolicy } from './site-policy'
import {
  paintLightSurface,
  shouldPaintOpaqueLightSurface,
  SURFACE_FLOOR_ATTR,
} from './light-surface-utils'

/**
 * 启发式候选（比裸 `div` 更窄）：语义块 + 常见组件 class 片段。
 * 仍由 `shouldPaintOpaqueLightSurface` 过滤透明层与小面板。
 */
const HEURISTIC_SURFACE_QUERY = [
  'section',
  'article',
  'aside',
  'div[class*="__"]',
  'div[class*="footer"]',
  'div[class*="header"]',
  'div[class*="hero"]',
  'div[class*="banner"]',
  'div[class*="panel"]',
  'div[class*="card"]',
  'div[class*="sheet"]',
].join(', ')

function tryPaintCandidate(
  el: HTMLElement,
  touched: Set<HTMLElement>,
  surfacePolicy: ResolvedSurfaceRepairPolicy,
  styleCache: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (touched.has(el) || el.hasAttribute(SURFACE_FLOOR_ATTR)) return false
  if (!shouldPaintOpaqueLightSurface(el, surfacePolicy, styleCache)) return false
  paintLightSurface(el)
  touched.add(el)
  return true
}

function sweepSelectorList(
  doc: Document,
  selectorList: string,
  budget: SamplingBudget,
  touched: Set<HTMLElement>,
  surfacePolicy: ResolvedSurfaceRepairPolicy,
  styleCache: Map<HTMLElement, CSSStyleDeclaration>,
  deadline: number,
  now: () => number,
  skipLandmarks = false,
): number {
  if (!selectorList.trim()) return 0

  let count = 0
  for (const node of doc.querySelectorAll(selectorList)) {
    if (count >= budget.maxNodes) break
    if (isPastDeadline(now(), deadline)) break
    if (!(node instanceof HTMLElement)) continue
    if (skipLandmarks && isSurfaceLandmark(node)) continue
    if (tryPaintCandidate(node, touched, surfacePolicy, styleCache)) count += 1
  }
  return count
}

/** 仅扫描 policy 地标（快路径，首屏 idle 前可同步跑）。 */
export function sweepVisibleLandmarkSurfaces(
  doc: Document,
  budget: SamplingBudget,
  now: () => number = Date.now,
): number {
  const surfacePolicy = getActiveSitePolicy().surfaceRepair
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
  const deadline = computeDeadlineMs(now(), budget.maxMs)
  return sweepSelectorList(
    doc,
    surfacePolicy.landmarkSelectorList,
    budget,
    new Set<HTMLElement>(),
    surfacePolicy,
    styleCache,
    deadline,
    now,
  )
}

/** 启发式 query（较慢，延后到 idle 跑）。 */
export function sweepVisibleHeuristicSurfaces(
  doc: Document,
  budget: SamplingBudget,
  now: () => number = Date.now,
): number {
  const surfacePolicy = getActiveSitePolicy().surfaceRepair
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
  const deadline = computeDeadlineMs(now(), budget.maxMs)
  return sweepSelectorList(
    doc,
    HEURISTIC_SURFACE_QUERY,
    budget,
    new Set<HTMLElement>(),
    surfacePolicy,
    styleCache,
    deadline,
    now,
    true,
  )
}

/** 扫描视口相关节点；预算内尽量多铺实色浅底。 */
export function sweepVisibleLightSurfaces(
  doc: Document,
  budget: SamplingBudget,
  now: () => number = Date.now,
): number {
  const touched = new Set<HTMLElement>()
  const surfacePolicy = getActiveSitePolicy().surfaceRepair
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
  const deadline = computeDeadlineMs(now(), budget.maxMs)

  let count = 0
  count += sweepSelectorList(
    doc,
    surfacePolicy.landmarkSelectorList,
    budget,
    touched,
    surfacePolicy,
    styleCache,
    deadline,
    now,
  )
  count += sweepSelectorList(
    doc,
    HEURISTIC_SURFACE_QUERY,
    budget,
    touched,
    surfacePolicy,
    styleCache,
    deadline,
    now,
    true,
  )
  return count
}
