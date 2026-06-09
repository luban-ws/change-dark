/**
 * RFC 031 P1-4：Dynamic 改色 MutationObserver（rAF 合并 + RFC 006 idle 分片）。
 */

import {
  analyzeRecolorMutations,
  applyRecolorMutationFlush,
  colorProfileForPagePalette,
  RECOLOR_MUTATION_OBSERVER_INIT,
} from '@luban-ws/dynamic-recolor'
import type { PagePalette, SamplingBudget, ThemeFiltersStateV1 } from '@luban-ws/extension-settings'

import { scheduleIdleTask } from './sampling'
import { scheduleBackgroundImageRecolorForElements } from './recolor-background-images'

type IdleSchedule = (task: () => void) => void

let observer: MutationObserver | null = null
let rafId: number | null = null
let pendingRecords: MutationRecord[] = []
let activeConfig: {
  doc: Document
  themeFilters: ThemeFiltersStateV1
  budget: SamplingBudget
  pagePalette: PagePalette
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
        colorProfileForPagePalette(activeConfig.pagePalette),
        activeConfig.baseCss,
      )
      void result
      scheduleBackgroundImageRecolorForElements(
        plan.backgroundImageElements,
        activeConfig.budget,
      )
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
  pagePalette: PagePalette,
  baseCss: string,
  doc: Document = document,
): void {
  stopRecolorDynamicObserver()
  activeConfig = { doc, themeFilters, budget, pagePalette, baseCss }
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
