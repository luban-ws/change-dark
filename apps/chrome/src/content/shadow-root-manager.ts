/**
 * RFC 0037 Task 3 & Task 4：开放 ShadowRoot 与 `adoptedStyleSheets` 管理器。
 *
 * - 发现初始 DOM 与新增子树中的开放 ShadowRoot，并监听 MAIN-world hook
 *   发出的 `change-dark:open-shadow-attached` 事件（`WeakSet` 保证每个 root 只注册一次）。
 * - 为每个已注册 ShadowRoot 安装独立 `MutationObserver`（忽略扩展自身注入节点，避免循环）。
 * - 使用 `AdoptedStyleSheetTracker` 维护共享 constructed `CSSStyleSheet` 反向索引，
 *   并与 MAIN-world `change-dark:cssom-mutated` 联动，以 rAF + `SamplingBudget` idle 分片合并重建。
 * - `stopShadowRootManager()` 拆除全部监听、清理每个 ShadowRoot 的覆盖 `<style>`，
 *   并恢复所有孤立世界与 MAIN-world 的 `CSSStyleSheet` 原生方法。
 */

import {
  AdoptedStyleSheetTracker,
  SHADOW_STYLE_OWNED_ATTR,
  buildRecolorInjectionForRoot,
  ensureShadowStyleElement,
  removeShadowStyleElement,
  type ResolvedThemePalette,
  type StyleRoot,
} from '@change-dark/dynamic-recolor'
import {
  STYLE_ELEMENT_ID,
  computeDeadlineMs,
  isPastDeadline,
  type SamplingBudget,
  type ThemeFiltersStateV1,
} from '@change-dark/extension-settings'
import { scheduleIdleTask } from './sampling'
import { getActiveSitePolicy } from './site-policy'

export const OPEN_SHADOW_ATTACHED_EVENT = 'change-dark:open-shadow-attached'
export const CSSOM_WATCH_START_EVENT = 'change-dark:cssom-watch-start'
export const CSSOM_WATCH_STOP_EVENT = 'change-dark:cssom-watch-stop'
export const CSSOM_MUTATED_EVENT = 'change-dark:cssom-mutated'

const SHADOW_OBSERVER_INIT: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['rel', 'href', 'disabled', 'media'],
}

type IdleSchedule = (task: () => void) => void

export interface ShadowRootManagerConfig {
  doc?: Document
  themeFilters: ThemeFiltersStateV1
  budget: SamplingBudget
  theme: ResolvedThemePalette
  onDocumentInvalidated: () => void
  now?: () => number
}

interface ShadowRootEntry {
  root: ShadowRoot
  observer: MutationObserver
  rebuildCount: number
}

interface ManagerState {
  doc: Document
  themeFilters: ThemeFiltersStateV1
  budget: SamplingBudget
  theme: ResolvedThemePalette
  onDocumentInvalidated: () => void
  now: () => number
  tracker: AdoptedStyleSheetTracker
  registeredRoots: WeakSet<ShadowRoot>
  entries: Map<ShadowRoot, ShadowRootEntry>
  dirtyRoots: Set<StyleRoot>
  rafId: number | null
  pendingCssomReconcile: boolean
  onAttachedListener: (event: Event) => void
  onCssomMutatedListener: () => void
}

let activeState: ManagerState | null = null
let idleSchedule: IdleSchedule = scheduleIdleTask

/** 测试钩子：将 idle 调度改为同步执行。 */
export function __setShadowManagerIdleScheduleForTests(fn: IdleSchedule): void {
  idleSchedule = fn
}

export function getRegisteredShadowRootCountForTests(): number {
  return activeState?.entries.size ?? 0
}

export function getShadowRootRebuildCountForTests(root: ShadowRoot): number {
  return activeState?.entries.get(root)?.rebuildCount ?? 0
}

function isElementNode(node: Node | null): node is Element {
  return Boolean(node && typeof Element !== 'undefined' && node instanceof Element)
}

function isExtensionOwnedShadowNode(node: Node | null): boolean {
  if (!isElementNode(node)) return false
  return node.hasAttribute(SHADOW_STYLE_OWNED_ATTR) || node.id === STYLE_ELEMENT_ID
}

function nodeMayAffectStyles(node: Node): boolean {
  if (!isElementNode(node)) return false
  if (isExtensionOwnedShadowNode(node)) return false
  const tag = node.tagName.toLowerCase()
  if (tag === 'style' || tag === 'link') return true
  return Boolean(node.querySelector?.('style, link'))
}

function safeReadAdoptedSheets(root: StyleRoot): CSSStyleSheet[] {
  try {
    return Array.from(root.adoptedStyleSheets ?? [])
  } catch {
    return []
  }
}

/** 从给定节点/子树深度优先发现全部开放 `ShadowRoot`（含嵌套 ShadowRoot）。 */
export function discoverOpenShadowRoots(root: ParentNode): ShadowRoot[] {
  const found: ShadowRoot[] = []
  const visitedContainers = new Set<ParentNode>()
  const visitedShadows = new Set<ShadowRoot>()
  const stack: ParentNode[] = [root]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (visitedContainers.has(current)) continue
    visitedContainers.add(current)

    const candidates: Element[] = []
    if (isElementNode(current as unknown as Node)) {
      candidates.push(current as unknown as Element)
    }
    try {
      for (const el of Array.from(current.querySelectorAll('*'))) {
        candidates.push(el)
      }
    } catch {
      /* 非完整 ParentNode 时跳过 */
    }

    for (const el of candidates) {
      let sr: ShadowRoot | null = null
      try {
        sr = el.shadowRoot
      } catch {
        sr = null
      }
      if (!sr || sr.mode !== 'open' || visitedShadows.has(sr)) continue
      visitedShadows.add(sr)
      found.push(sr)
      stack.push(sr)
    }
  }

  return found
}

function rebuildShadowRoot(sr: ShadowRoot, state: ManagerState): void {
  const entry = state.entries.get(sr)
  if (!entry) return

  // 若 host 已被彻底移出 document（如 SPA 卸载组件），保留清理或仅刷新当前树；仍遵循停止/清理边界
  const build = buildRecolorInjectionForRoot(
    sr,
    state.themeFilters,
    state.theme.profile,
    { cssVarSubstitute: getActiveSitePolicy().recolor.cssVarSubstitute },
  )

  entry.observer.disconnect()
  try {
    ensureShadowStyleElement(sr, build.overrideCss)
  } finally {
    if (activeState === state && state.entries.has(sr)) {
      entry.observer.observe(sr, SHADOW_OBSERVER_INIT)
    }
  }

  state.tracker.setRootSheets(sr, build.adoptedSheets)
  for (const sheet of build.adoptedSheets) {
    state.tracker.refreshSnapshot(sheet)
  }
  entry.rebuildCount += 1
}

function handleShadowRootMutations(
  sr: ShadowRoot,
  records: MutationRecord[],
  state: ManagerState,
): void {
  if (activeState !== state) return

  let needsRebuild = false
  const addedRootsToScan: Node[] = []

  for (const record of records) {
    if (
      isExtensionOwnedShadowNode(record.target) ||
      isExtensionOwnedShadowNode(record.target.parentNode)
    ) {
      continue
    }

    if (record.type === 'childList') {
      if (isElementNode(record.target) && record.target.tagName.toLowerCase() === 'style') {
        needsRebuild = true
      }
      for (const node of Array.from(record.addedNodes)) {
        if (isExtensionOwnedShadowNode(node)) continue
        addedRootsToScan.push(node)
        if (nodeMayAffectStyles(node)) needsRebuild = true
      }
      for (const node of Array.from(record.removedNodes)) {
        if (isExtensionOwnedShadowNode(node)) continue
        if (nodeMayAffectStyles(node)) needsRebuild = true
      }
    } else if (record.type === 'characterData') {
      const parent = record.target.parentNode
      if (
        isElementNode(parent) &&
        !isExtensionOwnedShadowNode(parent) &&
        parent.tagName.toLowerCase() === 'style'
      ) {
        needsRebuild = true
      }
    } else if (record.type === 'attributes') {
      if (isElementNode(record.target) && !isExtensionOwnedShadowNode(record.target)) {
        const tag = record.target.tagName.toLowerCase()
        if (tag === 'style' || tag === 'link') {
          needsRebuild = true
        }
      }
    }
  }

  for (const added of addedRootsToScan) {
    if ('querySelectorAll' in added) {
      for (const nested of discoverOpenShadowRoots(added as ParentNode)) {
        registerShadowRoot(nested, state, true)
      }
    }
  }

  if (needsRebuild) {
    markRootsDirty([sr], state)
  }
}

function registerShadowRoot(
  sr: ShadowRoot,
  state: ManagerState,
  paintNow: boolean,
): void {
  if (sr.mode !== 'open' || state.registeredRoots.has(sr)) return
  state.registeredRoots.add(sr)

  const observer = new MutationObserver((records) => {
    handleShadowRootMutations(sr, records, state)
  })
  const entry: ShadowRootEntry = { root: sr, observer, rebuildCount: 0 }
  state.entries.set(sr, entry)
  observer.observe(sr, SHADOW_OBSERVER_INIT)

  if (paintNow) {
    rebuildShadowRoot(sr, state)
  }

  for (const nested of discoverOpenShadowRoots(sr)) {
    registerShadowRoot(nested, state, paintNow)
  }
}

function isShadowRoot(root: StyleRoot): root is ShadowRoot {
  return !('documentElement' in root)
}

function drainDirtyRoots(state: ManagerState): void {
  if (activeState !== state) return

  if (state.pendingCssomReconcile) {
    state.pendingCssomReconcile = false
    state.tracker.setRootSheets(state.doc, safeReadAdoptedSheets(state.doc))
    for (const sr of state.entries.keys()) {
      state.tracker.setRootSheets(sr, safeReadAdoptedSheets(sr))
    }
    for (const invalidated of state.tracker.reconcileAllTrackedSheets()) {
      state.dirtyRoots.add(invalidated)
    }
  }

  if (state.dirtyRoots.size === 0) return

  const deadline = computeDeadlineMs(state.now(), state.budget.maxMs)
  let processed = 0

  for (const root of Array.from(state.dirtyRoots)) {
    if (processed > 0 && isPastDeadline(state.now(), deadline)) {
      scheduleFlush(state)
      return
    }
    state.dirtyRoots.delete(root)
    processed += 1

    if (root === state.doc) {
      state.onDocumentInvalidated()
      const docAdopted = safeReadAdoptedSheets(state.doc)
      state.tracker.setRootSheets(state.doc, docAdopted)
      for (const sheet of docAdopted) {
        state.tracker.refreshSnapshot(sheet)
      }
    } else if (isShadowRoot(root) && state.entries.has(root)) {
      rebuildShadowRoot(root, state)
    }
  }
}

function scheduleFlush(state: ManagerState): void {
  if (activeState !== state || state.rafId != null) return
  state.rafId = requestAnimationFrame(() => {
    if (activeState !== state) return
    state.rafId = null
    idleSchedule(() => {
      drainDirtyRoots(state)
    })
  })
}

function markRootsDirty(roots: Iterable<StyleRoot>, state: ManagerState): void {
  if (activeState !== state) return
  let added = false
  for (const r of roots) {
    if (r === state.doc || (isShadowRoot(r) && state.entries.has(r))) {
      state.dirtyRoots.add(r)
      added = true
    }
  }
  if (added) {
    scheduleFlush(state)
  }
}

/**
 * 启动开放 ShadowRoot 与 `adoptedStyleSheets` 管理器（先清理旧实例）。
 * 同步扫描并改色初始已存在的开放 ShadowRoot；运行期变更通过 rAF + idle 合并刷新。
 */
export function startShadowRootManager(config: ShadowRootManagerConfig): void {
  stopShadowRootManager()

  const doc = config.doc ?? document
  const now = config.now ?? (() => Date.now())

  const state: ManagerState = {
    doc,
    themeFilters: config.themeFilters,
    budget: config.budget,
    theme: config.theme,
    onDocumentInvalidated: config.onDocumentInvalidated,
    now,
    tracker: new AdoptedStyleSheetTracker((roots) => {
      markRootsDirty(roots, state)
    }),
    registeredRoots: new WeakSet<ShadowRoot>(),
    entries: new Map<ShadowRoot, ShadowRootEntry>(),
    dirtyRoots: new Set<StyleRoot>(),
    rafId: null,
    pendingCssomReconcile: false,
    onAttachedListener: (event: Event) => {
      if (activeState !== state) return
      const path0 =
        typeof event.composedPath === 'function' ? event.composedPath()[0] : null
      const candidate = (path0 ?? event.target) as Node | null
      if (!isElementNode(candidate)) return
      let sr: ShadowRoot | null = null
      try {
        sr = candidate.shadowRoot
      } catch {
        sr = null
      }
      if (!sr || sr.mode !== 'open') return
      if (state.registeredRoots.has(sr)) return
      registerShadowRoot(sr, state, false)
      markRootsDirty([sr], state)
    },
    onCssomMutatedListener: () => {
      if (activeState !== state) return
      state.pendingCssomReconcile = true
      scheduleFlush(state)
    },
  }

  activeState = state

  doc.addEventListener(OPEN_SHADOW_ATTACHED_EVENT, state.onAttachedListener, true)
  doc.addEventListener(CSSOM_MUTATED_EVENT, state.onCssomMutatedListener)
  try {
    doc.dispatchEvent(new CustomEvent(CSSOM_WATCH_START_EVENT))
  } catch {
    /* ignore */
  }

  state.tracker.setRootSheets(doc, safeReadAdoptedSheets(doc))

  for (const sr of discoverOpenShadowRoots(doc)) {
    registerShadowRoot(sr, state, true)
  }
}

/** 扫描 Document 新增 DOM 子树中的开放 ShadowRoot（覆盖离屏 `attachShadow` 后再挂载）。 */
export function scanAddedSubtreeForShadowRoots(nodes: Iterable<Node>): void {
  const state = activeState
  if (!state) return
  const newlyRegistered: ShadowRoot[] = []
  for (const node of nodes) {
    if (!('querySelectorAll' in node)) continue
    for (const sr of discoverOpenShadowRoots(node as ParentNode)) {
      if (!state.registeredRoots.has(sr)) {
        registerShadowRoot(sr, state, false)
        newlyRegistered.push(sr)
      }
    }
  }
  if (newlyRegistered.length > 0) {
    markRootsDirty(newlyRegistered, state)
  }
}

/** 同步 Document 当前 `adoptedStyleSheets` 至反向索引。 */
export function syncDocumentAdoptedStyleSheets(): void {
  const state = activeState
  if (!state) return
  const sheets = safeReadAdoptedSheets(state.doc)
  state.tracker.setRootSheets(state.doc, sheets)
  for (const sheet of sheets) {
    state.tracker.refreshSnapshot(sheet)
  }
}

/** 停用管理器：拆除监听与 shadow 覆盖层，并恢复全部被包装的 `CSSStyleSheet` 方法。 */
export function stopShadowRootManager(): void {
  const state = activeState
  if (!state) return
  activeState = null

  if (state.rafId != null) {
    cancelAnimationFrame(state.rafId)
    state.rafId = null
  }
  state.pendingCssomReconcile = false
  state.dirtyRoots.clear()

  state.doc.removeEventListener(
    OPEN_SHADOW_ATTACHED_EVENT,
    state.onAttachedListener,
    true,
  )
  state.doc.removeEventListener(CSSOM_MUTATED_EVENT, state.onCssomMutatedListener)

  for (const [sr, entry] of state.entries.entries()) {
    entry.observer.disconnect()
    removeShadowStyleElement(sr)
  }
  state.entries.clear()

  state.tracker.dispose()

  try {
    state.doc.dispatchEvent(new CustomEvent(CSSOM_WATCH_STOP_EVENT))
  } catch {
    /* ignore */
  }
}

/** 测试钩子：同步冲刷当前队列（rAF + idle）并执行 dirty root 重建。 */
export function __flushShadowManagerForTests(): void {
  const state = activeState
  if (!state) return
  if (state.rafId != null) {
    cancelAnimationFrame(state.rafId)
    state.rafId = null
  }
  idleSchedule(() => {
    drainDirtyRoots(state)
  })
}
