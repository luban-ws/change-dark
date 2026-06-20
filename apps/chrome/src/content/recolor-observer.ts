/**
 * RFC 031 P1-4：Dynamic 改色 MutationObserver（rAF 合并 + RFC 006 idle 分片）。
 */

import {
  analyzeRecolorMutations,
  applyRecolorMutationFlush,
  RECOLOR_MUTATION_OBSERVER_INIT,
  type ResolvedThemePalette,
} from '@change-dark/dynamic-recolor'
import type { SamplingBudget, ThemeFiltersStateV1 } from '@change-dark/extension-settings'

import { scheduleIdleTask } from './sampling'
import { scheduleBackgroundImageRecolorForElements } from './recolor-background-images'
import { sweepDocumentLightSurfaces } from './document-light-surface-sweep'
import { applyPageSurfaceFloor } from './page-surface-floor'
import { sweepVisibleLightSurfaces } from './visible-light-surface-sweep'

type IdleSchedule = (task: () => void) => void

let observer: MutationObserver | null = null
let rafId: number | null = null
let pendingRecords: MutationRecord[] = []
let activeConfig: {
  doc: Document
  themeFilters: ThemeFiltersStateV1
  budget: SamplingBudget
  theme: ResolvedThemePalette
  /** Dynamic 采样铺底；MO 重建 stylesheet 覆盖层时须合并，避免 body 留白。 */
  baseCss: string
} | null = null
let idleSchedule: IdleSchedule = scheduleIdleTask

/** 测试钩子：将 idle 调度改为同步执行。 */
export function __setRecolorObserverIdleScheduleForTests(fn: IdleSchedule): void {
  idleSchedule = fn
}

function flushPendingRecords(): void {
  rafId = null
  const config = activeConfig
  if (!config) {
    pendingRecords = []
    return
  }

  const records = pendingRecords
  pendingRecords = []
  const plan = analyzeRecolorMutations(records)
  if (!plan.rebuildStylesheets && plan.inlineElements.length === 0 && plan.backgroundImageElements.length === 0) return

  observer?.disconnect()
  try {
    idleSchedule(() => {
      if (!activeConfig) return
      const result = applyRecolorMutationFlush(
        activeConfig.doc,
        plan,
        activeConfig.themeFilters,
        activeConfig.budget,
        activeConfig.theme.profile,
        activeConfig.baseCss,
      )
      void result
      scheduleBackgroundImageRecolorForElements(
        plan.backgroundImageElements,
        activeConfig.budget,
      )
      applyPageSurfaceFloor(activeConfig.doc)
      sweepVisibleLightSurfaces(activeConfig.doc, activeConfig.budget)
      sweepDocumentLightSurfaces(activeConfig.doc, activeConfig.budget)
    })
  } finally {
    if (observer && activeConfig) {
      observer.observe(activeConfig.doc.documentElement, RECOLOR_MUTATION_OBSERVER_INIT)
    }
  }
}

function queueMutationRecords(records: MutationRecord[]): void {
  pendingRecords.push(...records)
  if (rafId != null) return
  rafId = requestAnimationFrame(flushPendingRecords)
}

/**
 * 在 Dynamic recolor 主路径成功后启动 MO；重复调用会先 stop 再 start。
 */
export function startRecolorDynamicObserver(
  themeFilters: ThemeFiltersStateV1,
  budget: SamplingBudget,
  theme: ResolvedThemePalette,
  baseCss: string,
  doc: Document = document,
): void {
  stopRecolorDynamicObserver()
  activeConfig = { doc, themeFilters, budget, theme, baseCss }
  observer = new MutationObserver((records) => queueMutationRecords(records))
  observer.observe(doc.documentElement, RECOLOR_MUTATION_OBSERVER_INIT)
}

/** 停止 MO 并丢弃待处理队列（重绘/关闭/回退前调用）。 */
export function stopRecolorDynamicObserver(): void {
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  pendingRecords = []
  observer?.disconnect()
  observer = null
  activeConfig = null
}

/** 测试：同步跑完 rAF 队列（不等待 idle）。 */
export function flushRecolorDynamicObserverRafForTests(): void {
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  flushPendingRecords()
}

/** 延迟重绘后刷新采样铺底，供 MO 重建时合并。 */
export function updateRecolorObserverPaintState(baseCss: string): void {
  if (activeConfig) activeConfig.baseCss = baseCss
}

/** @deprecated 使用 `updateRecolorObserverPaintState` */
export function updateRecolorObserverBaseCss(baseCss: string): void {
  updateRecolorObserverPaintState(baseCss)
}
