import { computeDeadlineMs, isPastDeadline, type SamplingBudget } from '@luban-ws/extension-settings'
import { parseCssRgbToTriplet } from '@luban-ws/dynamic-recolor'

/** 视口横纵比例（0..1），与 `VIEWPORT_FRAC_Y` 组合成 `elementsFromPoint` 命中点。 */
const VIEWPORT_FRAC_X = {
  LEFT: 0.15,
  CENTER: 0.5,
  RIGHT: 0.85,
  INSET_LEFT: 0.22,
  INSET_RIGHT: 0.78,
} as const

/** 纵坐标比例；含中下区以减轻「浅色顶栏」在 Dynamic 聚合里对样本的支配（与 Rust 亮度双簇正交）。 */
const VIEWPORT_FRAC_Y = {
  TOP: 0.15,
  MID: 0.5,
  MAIN_LOWER_1: 0.42,
  MAIN_LOWER_2: 0.58,
  MAIN_LOWER_3: 0.62,
  BOTTOM: 0.85,
} as const

/**
 * 在 `requestIdleCallback` 不可用时用 `setTimeout(0)` 分片，避免长时间阻塞主线程（RFC 006）。
 */
export function scheduleIdleTask(task: () => void): void {
  const ric = (
    globalThis as unknown as {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number
    }
  ).requestIdleCallback
  if (typeof ric === 'function') {
    ric(() => task(), { timeout: 80 })
  } else {
    setTimeout(task, 0)
  }
}

/** `document_start` 后若 DOM 未就绪则等待 `DOMContentLoaded`。 */
export function whenDomReady(): Promise<void> {
  if (document.readyState === 'loading') {
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
    })
  }
  return Promise.resolve()
}

/**
 * 等待 `window` `load`（`document.readyState === 'complete'`）。
 * Dynamic 采样依赖视口尺寸与已计算样式；仅 `DOMContentLoaded` 时常见 `clientWidth === 0` 或样本过少。
 */
export function whenDocumentComplete(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true })
  })
}

/**
 * 分层抽样：视口 `elementsFromPoint` 若干点 + 文档树深度优先遍历；
 * 在节点数与时间墙任一达到上限时停止。输出 RFC 005 扁平 RGB。
 */
export function collectPageBackgroundRgbBuffer(
  budget: SamplingBudget,
  now: () => number,
): Uint8Array {
  const deadline = computeDeadlineMs(now(), budget.maxMs)
  const seen = new Set<Element>()
  const out: number[] = []

  function trySample(el: Element): void {
    if (seen.has(el)) return
    if (isPastDeadline(now(), deadline)) return
    if (seen.size >= budget.maxNodes) return
    seen.add(el)
    const bg = getComputedStyle(el).backgroundColor
    const t = parseCssRgbToTriplet(bg)
    if (t) {
      out.push(t[0], t[1], t[2])
    }
  }

  const rootEl = document.documentElement
  const w = rootEl.clientWidth
  const h = rootEl.clientHeight
  if (w > 0 && h > 0) {
    const points = [
      { x: Math.floor(w * VIEWPORT_FRAC_X.CENTER), y: Math.floor(h * VIEWPORT_FRAC_Y.MID) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.LEFT), y: Math.floor(h * VIEWPORT_FRAC_Y.TOP) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.RIGHT), y: Math.floor(h * VIEWPORT_FRAC_Y.TOP) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.LEFT), y: Math.floor(h * VIEWPORT_FRAC_Y.BOTTOM) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.RIGHT), y: Math.floor(h * VIEWPORT_FRAC_Y.BOTTOM) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.CENTER), y: Math.floor(h * VIEWPORT_FRAC_Y.MAIN_LOWER_1) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.CENTER), y: Math.floor(h * VIEWPORT_FRAC_Y.MAIN_LOWER_2) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.INSET_LEFT), y: Math.floor(h * VIEWPORT_FRAC_Y.MAIN_LOWER_3) },
      { x: Math.floor(w * VIEWPORT_FRAC_X.INSET_RIGHT), y: Math.floor(h * VIEWPORT_FRAC_Y.MAIN_LOWER_3) },
    ]
    for (const p of points) {
      if (isPastDeadline(now(), deadline) || seen.size >= budget.maxNodes) break
      let stack: Element[]
      try {
        stack = [...document.elementsFromPoint(p.x, p.y)]
      } catch {
        continue
      }
      for (const el of stack.slice(0, 14)) {
        if (!(el instanceof Element)) continue
        trySample(el)
        if (seen.size >= budget.maxNodes || isPastDeadline(now(), deadline)) break
      }
    }
  }

  const treeRoot = document.body ?? document.documentElement
  const stack: Element[] = [treeRoot]
  while (stack.length > 0) {
    if (isPastDeadline(now(), deadline) || seen.size >= budget.maxNodes) break
    const el = stack.pop()!
    trySample(el)
    for (let i = el.children.length - 1; i >= 0; i--) {
      stack.push(el.children[i] as Element)
    }
  }

  return new Uint8Array(out)
}
