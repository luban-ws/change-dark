/**
 * RFC 0037 Task 4：共享 constructed `CSSStyleSheet` 反向索引与引用计数 CSSOM 观察器。
 *
 * - 维护 `CSSStyleSheet ↔ Set<StyleRoot>` 多对多反向索引。
 * - 当某张 sheet 至少被 1 个已注册 root 采用时，包装 `insertRule` / `deleteRule` /
 *   `replace` / `replaceSync`，严格保留原始 `this`、参数、返回值、异常与 Promise 语义。
 * - 当最后一个消费者移除或 `dispose()` 时，恢复原始属性描述符，不留残余 wrapper。
 * - 提供 `reconcileAllTrackedSheets()`，结合 MAIN-world 通知对比可读规则快照，仅令真正变化的 root 失效。
 */

import {
  serializeStylesheetCssRules,
  type StyleRoot,
} from './stylesheet-collect'

export const WRAPPED_CSSOM_METHODS = [
  'insertRule',
  'deleteRule',
  'replace',
  'replaceSync',
] as const

export type WrappedCssomMethod = (typeof WRAPPED_CSSOM_METHODS)[number]

function safeSerializeSheet(sheet: CSSStyleSheet): string {
  try {
    return serializeStylesheetCssRules(sheet)
  } catch {
    return ''
  }
}

export class AdoptedStyleSheetTracker {
  private readonly sheetToRoots = new Map<CSSStyleSheet, Set<StyleRoot>>()
  private readonly rootToSheets = new Map<StyleRoot, Set<CSSStyleSheet>>()
  private readonly sheetSnapshots = new Map<CSSStyleSheet, string>()
  private readonly originalDescriptors = new Map<
    CSSStyleSheet,
    Map<WrappedCssomMethod, PropertyDescriptor | undefined>
  >()

  constructor(
    private readonly onRootsInvalidated: (
      roots: ReadonlySet<StyleRoot>,
      sheet: CSSStyleSheet,
    ) => void,
  ) {}

  /** 更新某个 `StyleRoot` 当前采用的 `adoptedStyleSheets` 集合（按引用计数装/拆 wrapper）。 */
  setRootSheets(root: StyleRoot, sheets: readonly CSSStyleSheet[]): void {
    const nextSet = new Set(sheets)
    const prevSet = this.rootToSheets.get(root) ?? new Set<CSSStyleSheet>()

    for (const oldSheet of prevSet) {
      if (!nextSet.has(oldSheet)) {
        this.unlinkRootFromSheet(root, oldSheet)
      }
    }

    if (nextSet.size === 0) {
      this.rootToSheets.delete(root)
      return
    }

    this.rootToSheets.set(root, nextSet)
    for (const sheet of nextSet) {
      if (!prevSet.has(sheet)) {
        this.linkRootToSheet(root, sheet)
      }
    }
  }

  /** 移除指定 root 并按引用计数清理不再被消费的 sheet wrapper。 */
  removeRoot(root: StyleRoot): void {
    this.setRootSheets(root, [])
  }

  /** 查询当前采用某张 constructed sheet 的全部已注册 roots。 */
  getRootsForSheet(sheet: CSSStyleSheet): ReadonlySet<StyleRoot> {
    return this.sheetToRoots.get(sheet) ?? new Set<StyleRoot>()
  }

  /** 刷新已构建 sheet 的快照（避免 rebuild 后误判为二次变化）。 */
  refreshSnapshot(sheet: CSSStyleSheet): void {
    if (!this.sheetToRoots.has(sheet)) return
    this.sheetSnapshots.set(sheet, safeSerializeSheet(sheet))
  }

  /** 对比所有被追踪 sheet 的序列化规则快照；仅返回规则真正发生变化的 roots。 */
  reconcileAllTrackedSheets(): Set<StyleRoot> {
    const dirtyRoots = new Set<StyleRoot>()
    for (const [sheet, roots] of this.sheetToRoots.entries()) {
      const prev = this.sheetSnapshots.get(sheet)
      const next = safeSerializeSheet(sheet)
      if (prev !== next) {
        this.sheetSnapshots.set(sheet, next)
        for (const root of roots) {
          dirtyRoots.add(root)
        }
      }
    }
    return dirtyRoots
  }

  /** 停用时拆除全部 wrapper 并清空状态。 */
  dispose(): void {
    for (const root of Array.from(this.rootToSheets.keys())) {
      this.removeRoot(root)
    }
    for (const sheet of Array.from(this.originalDescriptors.keys())) {
      this.unwrapSheet(sheet)
    }
    this.sheetToRoots.clear()
    this.rootToSheets.clear()
    this.sheetSnapshots.clear()
    this.originalDescriptors.clear()
  }

  private linkRootToSheet(root: StyleRoot, sheet: CSSStyleSheet): void {
    let roots = this.sheetToRoots.get(sheet)
    if (!roots) {
      roots = new Set<StyleRoot>()
      this.sheetToRoots.set(sheet, roots)
      this.sheetSnapshots.set(sheet, safeSerializeSheet(sheet))
      this.wrapSheet(sheet)
    }
    roots.add(root)
  }

  private unlinkRootFromSheet(root: StyleRoot, sheet: CSSStyleSheet): void {
    const roots = this.sheetToRoots.get(sheet)
    if (!roots) return
    roots.delete(root)
    if (roots.size === 0) {
      this.sheetToRoots.delete(sheet)
      this.sheetSnapshots.delete(sheet)
      this.unwrapSheet(sheet)
    }
  }

  private notifySheetChanged(sheet: CSSStyleSheet): void {
    const roots = this.sheetToRoots.get(sheet)
    if (!roots || roots.size === 0) return
    this.sheetSnapshots.set(sheet, safeSerializeSheet(sheet))
    this.onRootsInvalidated(new Set(roots), sheet)
  }

  private wrapSheet(sheet: CSSStyleSheet): void {
    if (this.originalDescriptors.has(sheet)) return
    const saved = new Map<WrappedCssomMethod, PropertyDescriptor | undefined>()
    const tracker = this

    for (const method of WRAPPED_CSSOM_METHODS) {
      const ownDesc = Object.getOwnPropertyDescriptor(sheet, method)
      const current = (sheet as unknown as Record<string, unknown>)[method]
      if (typeof current !== 'function') continue
      saved.set(method, ownDesc)

      const origFn = current as (...args: unknown[]) => unknown
      const wrappedFn = function (this: CSSStyleSheet, ...args: unknown[]): unknown {
        const result = origFn.apply(this, args)
        if (method === 'replace') {
          return Promise.resolve(result).then((resolved) => {
            tracker.notifySheetChanged(sheet)
            return resolved
          })
        }
        tracker.notifySheetChanged(sheet)
        return result
      }

      try {
        Object.defineProperty(sheet, method, {
          configurable: true,
          enumerable: ownDesc?.enumerable ?? false,
          writable: true,
          value: wrappedFn,
        })
      } catch {
        saved.delete(method)
      }
    }

    this.originalDescriptors.set(sheet, saved)
  }

  private unwrapSheet(sheet: CSSStyleSheet): void {
    const saved = this.originalDescriptors.get(sheet)
    if (!saved) return
    for (const [method, ownDesc] of saved.entries()) {
      try {
        if (ownDesc !== undefined) {
          Object.defineProperty(sheet, method, ownDesc)
        } else {
          delete (sheet as unknown as Record<string, unknown>)[method]
        }
      } catch {
        /* 不可配置对象忽略 */
      }
    }
    this.originalDescriptors.delete(sheet)
  }
}
