/**
 * RFC 031 P1-3：扫描并改写 DOM 内联 `element.style` 颜色 longhand。
 *
 * 改色前备份原始 `style` 到 `INLINE_STYLE_BACKUP_ATTR`，重绘/关闭时从备份还原，避免二次改色漂移。
 */

import { INLINE_STYLE_BACKUP_ATTR } from '@change-dark/extension-settings'
import {
  RECOLOR_LONGHAND_PROPERTIES,
  readInlineStyleProperty,
  recolorInlineDeclaration,
} from './modify-css'
import {
  DEFAULT_DARK_PROFILE,
  type ColorProfile,
} from './modify-colors'

export interface InlineStylesRecolorResult {
  /** 至少改写了 1 条颜色 longhand 的元素数 */
  elementsRecolored: number
  /** 带 `[style]` 的元素数（扫描规模） */
  elementsScanned: number
}

/** 首次改色前保存原始 `style` 属性；已备份则返回备份值。 */
function ensureInlineStyleBackup(el: HTMLElement): string {
  const existing = el.getAttribute(INLINE_STYLE_BACKUP_ATTR)
  if (existing !== null) return existing
  const current = el.getAttribute('style') ?? ''
  if (current) {
    el.setAttribute(INLINE_STYLE_BACKUP_ATTR, current)
  }
  return current
}

/**
 * 按备份源色改写单个元素的内联颜色 longhand（`!important` 写回）。
 * @returns 是否改写了至少一条颜色声明
 */
export function recolorElementInlineStyle(
  el: HTMLElement,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): boolean {
  const backup = ensureInlineStyleBackup(el)
  if (!backup.trim()) return false

  let changed = false
  for (const prop of Object.keys(RECOLOR_LONGHAND_PROPERTIES)) {
    const val = readInlineStyleProperty(backup, prop)
    if (!val) continue
    const recolored = recolorInlineDeclaration(prop, val, profile)
    if (recolored == null) continue
    el.style.setProperty(prop, recolored, 'important')
    changed = true
  }
  return changed
}

/** 扫描子树内所有 `[style]` 元素并改色。 */
export function recolorInlineStylesInSubtree(
  root: ParentNode,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): InlineStylesRecolorResult {
  const nodes = root.querySelectorAll('[style]')
  let elementsRecolored = 0
  for (const node of Array.from(nodes)) {
    if (!(node instanceof HTMLElement)) continue
    if (recolorElementInlineStyle(node, profile)) {
      elementsRecolored += 1
    }
  }
  return { elementsRecolored, elementsScanned: nodes.length }
}

/** 整文档内联 style 改色（`paintRecolorPath` 调用）。 */
export function recolorInlineStylesInDocument(
  doc: Document = document,
  profile?: ColorProfile,
): InlineStylesRecolorResult {
  return recolorInlineStylesInSubtree(doc.documentElement, profile)
}

/** 从备份还原单个元素内联 style。 */
export function restoreElementInlineStyle(el: HTMLElement): boolean {
  const backup = el.getAttribute(INLINE_STYLE_BACKUP_ATTR)
  if (backup === null) return false
  if (backup) {
    el.setAttribute('style', backup)
  } else {
    el.removeAttribute('style')
  }
  el.removeAttribute(INLINE_STYLE_BACKUP_ATTR)
  return true
}

/** 还原子树内所有已备份的内联 style。 */
export function restoreInlineStylesInSubtree(root: ParentNode): number {
  const nodes = root.querySelectorAll(`[${INLINE_STYLE_BACKUP_ATTR}]`)
  let restored = 0
  for (const node of Array.from(nodes)) {
    if (node instanceof HTMLElement && restoreElementInlineStyle(node)) {
      restored += 1
    }
  }
  return restored
}

/** 还原整文档内联 style（重绘前 / 关闭强制暗色时调用）。 */
export function restoreInlineStylesInDocument(doc: Document = document): number {
  return restoreInlineStylesInSubtree(doc.documentElement)
}
