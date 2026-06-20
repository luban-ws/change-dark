/**
 * 视口采样：穿透透明层，仅对 allowlist 内实色浅底节点写 background-color。
 */

import {
  computeDeadlineMs,
  isPastDeadline,
  ROOT_ATTR,
  type SamplingBudget,
} from '@change-dark/extension-settings'

import {
  paintLightSurface,
  shouldPaintOpaqueLightSurface,
} from './light-surface-utils'
import { getActiveSitePolicy } from './site-policy'
import { sweepVisibleLightSurfaces } from './visible-light-surface-sweep'

const VIEWPORT_GRID_COLS = 8
const VIEWPORT_GRID_ROWS = 6

/** 视口边缘与 main 列边界 — 专抓 gutter / border 漏网浅底。 */
const GUTTER_EDGE_INSET_PX = 6
const GUTTER_Y_FRACTIONS = [0.12, 0.32, 0.52, 0.72, 0.92] as const

/** fixed header 高度带 — 网格首行常在 12% 处，会漏掉 64–128px 顶栏。 */
const TOP_CHROME_Y_PX = [4, 20, 44, 68, 96, 120] as const

function viewportGridPoints(doc: Document): Array<{ x: number; y: number }> {
  const w = doc.documentElement.clientWidth
  const h = doc.documentElement.clientHeight
  if (w <= 0 || h <= 0) return []

  const points: Array<{ x: number; y: number }> = []
  for (let row = 0; row < VIEWPORT_GRID_ROWS; row += 1) {
    for (let col = 0; col < VIEWPORT_GRID_COLS; col += 1) {
      points.push({
        x: Math.floor(((col + 0.5) / VIEWPORT_GRID_COLS) * w),
        y: Math.floor(((row + 0.5) / VIEWPORT_GRID_ROWS) * h),
      })
    }
  }
  return points
}

/** 左右 gutter + main 列边界采样点。 */
function gutterSamplePoints(doc: Document): Array<{ x: number; y: number }> {
  const w = doc.documentElement.clientWidth
  const h = doc.documentElement.clientHeight
  if (w <= 0 || h <= 0) return []

  const ys = GUTTER_Y_FRACTIONS.map((f) => Math.floor(f * h))
  const xs = new Set<number>([
    2,
    GUTTER_EDGE_INSET_PX,
    16,
    w - 2,
    w - GUTTER_EDGE_INSET_PX,
    w - 16,
  ])

  const gutterProbe = getActiveSitePolicy().surfaceRepair.gutterProbe
  const mainEl = gutterProbe
    ? doc.querySelector(gutterProbe.mainSelector)
    : doc.querySelector('main')
  if (mainEl instanceof HTMLElement) {
    const rect = mainEl.getBoundingClientRect()
    const inset = gutterProbe?.insetPx ?? 20
    if (rect.width > 0 && rect.height > 0) {
      xs.add(Math.max(0, Math.floor(rect.left + 4)))
      xs.add(Math.max(0, Math.floor(rect.left + inset)))
      xs.add(Math.min(w - 1, Math.floor(rect.right - 4)))
      xs.add(Math.min(w - 1, Math.floor(rect.right - inset)))
    }
  }

  const points: Array<{ x: number; y: number }> = []
  for (const x of xs) {
    for (const y of ys) points.push({ x, y })
  }
  return points
}

/** 顶栏高度带横纵采样（覆盖 fixed header / product nav）。 */
function topChromeSamplePoints(doc: Document): Array<{ x: number; y: number }> {
  const w = doc.documentElement.clientWidth
  if (w <= 0) return []

  const xs = [
    8,
    Math.floor(w * 0.15),
    Math.floor(w * 0.35),
    Math.floor(w * 0.5),
    Math.floor(w * 0.65),
    Math.floor(w * 0.85),
    w - 8,
  ]
  const points: Array<{ x: number; y: number }> = []
  for (const y of TOP_CHROME_Y_PX) {
    for (const x of xs) points.push({ x, y })
  }
  return points
}

/** 合并网格与 gutter 采样点（去重坐标）。 */
export function buildViewportSamplePoints(doc: Document): Array<{ x: number; y: number }> {
  const seen = new Set<string>()
  const out: Array<{ x: number; y: number }> = []
  for (const p of [
    ...topChromeSamplePoints(doc),
    ...viewportGridPoints(doc),
    ...gutterSamplePoints(doc),
  ]) {
    const key = `${p.x},${p.y}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

function sweepStackAtPoint(
  doc: Document,
  x: number,
  y: number,
  touched: Set<HTMLElement>,
): number {
  if (typeof doc.elementsFromPoint !== 'function') return 0

  let stack: Element[]
  try {
    stack = doc.elementsFromPoint(x, y)
  } catch {
    return 0
  }

  const surfacePolicy = getActiveSitePolicy().surfaceRepair
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()

  for (const el of stack) {
    if (!(el instanceof HTMLElement)) continue
    if (el === doc.documentElement) continue
    if (touched.has(el)) break
    if (!shouldPaintOpaqueLightSurface(el, surfacePolicy, styleCache)) continue

    paintLightSurface(el)
    touched.add(el)
    return 1
  }
  return 0
}

/** 视口网格 + gutter 采样；不跑全文档 query，避免给透明 wrapper 强铺底。 */
export function sweepDocumentLightSurfaces(
  doc: Document,
  budget: SamplingBudget,
  now: () => number = Date.now,
): number {
  const touched = new Set<HTMLElement>()
  let count = 0
  const deadline = computeDeadlineMs(now(), budget.maxMs)

  for (const point of buildViewportSamplePoints(doc)) {
    if (count >= budget.maxNodes) break
    if (isPastDeadline(now(), deadline)) break
    count += sweepStackAtPoint(doc, point.x, point.y, touched)
  }

  return count
}

let resweepTimer: number | undefined
let resweepListenerAttached = false

/** 滚动/缩放后 debounce 重采样，覆盖 fold 下方 footer 等浅底区块。 */
export function scheduleDocumentLightSurfaceResweep(
  doc: Document,
  budget: SamplingBudget,
  delayMs = 180,
): void {
  if (typeof window === 'undefined') return
  if (resweepTimer != null) window.clearTimeout(resweepTimer)
  resweepTimer = window.setTimeout(() => {
    resweepTimer = undefined
    if (!doc.documentElement.hasAttribute(ROOT_ATTR)) return
    sweepVisibleLightSurfaces(doc, budget)
    sweepDocumentLightSurfaces(doc, budget)
  }, delayMs)
}

/** 绑定 scroll/resize → debounced resweep（每文档一次）。 */
export function attachLightSurfaceResweepListeners(
  doc: Document,
  budget: SamplingBudget,
): void {
  if (typeof window === 'undefined' || resweepListenerAttached) return
  resweepListenerAttached = true
  const onChange = (): void =>
    scheduleDocumentLightSurfaceResweep(doc, budget)
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange, { passive: true })
}

/** @deprecated preset 改由 CSS 变量驱动，保留空实现避免旧调用方报错。 */
export function setActiveSurfacePageBg(_pageBg: string): void {}
