/**
 * RFC 031 P1-5：Dynamic 位图背景 idle 扫描（RFC 006 预算墙）。
 */

import { computeDeadlineMs, isPastDeadline, type SamplingBudget } from '@change-dark/extension-settings'
import {
  hasBitmapBackgroundImage,
  recolorBackgroundImagesInDocument,
  recolorElementBackgroundImage,
} from '@change-dark/dynamic-recolor'

import { scheduleIdleTask } from './sampling'

/** 首绘 / MO 补色后异步扫描位图背景并压暗亮图。 */
export function scheduleBackgroundImageRecolor(
  budget: SamplingBudget,
  doc: Document = document,
): void {
  scheduleIdleTask(() => {
    void recolorBackgroundImagesInDocument(doc, budget)
  })
}

/** 仅扫描指定元素（MutationObserver 增量路径）。 */
export function scheduleBackgroundImageRecolorForElements(
  elements: readonly HTMLElement[],
  budget: SamplingBudget,
): void {
  if (elements.length === 0) return
  scheduleIdleTask(() => {
    void (async () => {
      const deadline = computeDeadlineMs(Date.now(), budget.maxMs)
      let processed = 0
      for (const el of elements) {
        if (processed >= budget.maxNodes) break
        if (isPastDeadline(Date.now(), deadline)) break
        const inline = el.getAttribute('style') ?? ''
        const bg =
          getComputedStyle(el).backgroundImage
        const hasBg =
          hasBitmapBackgroundImage(inline) ||
          (bg !== 'none' && hasBitmapBackgroundImage(bg))
        if (hasBg) {
          await recolorElementBackgroundImage(el)
          processed += 1
        }
      }
    })()
  })
}
