/**
 * RFC 013/014：Filter / Filter+ 媒体二次反相 — 内联 `filter` 补偿（CSS 规则失效时的兜底）。
 * 视觉目标：照片/视频保持原色（不随整页反相翻转），与 Dynamic「媒体不动」一致。
 */

import {
  FILTER_CSS_INVERT_CHAIN,
  FILTER_MEDIA_FILTER_BACKUP_ATTR,
  FILTER_PLUS_SVG_FILTER_ID,
  FILTER_PLUS_SVG_HOST_ID,
} from './constants'

export type FilterMediaCompensationKind = 'css-invert' | 'filter-plus-svg'

/** 与 `buildFilterInvertCss` / `buildFilterPlusCss` 媒体规则同语义。 */
export function filterMediaCompensationFilterValue(
  kind: FilterMediaCompensationKind,
): string {
  return kind === 'filter-plus-svg'
    ? `url(#${FILTER_PLUS_SVG_FILTER_ID})`
    : FILTER_CSS_INVERT_CHAIN
}

/** 与 `buildFilterInvertMediaSelectorList` 对齐（不含 `picture` 容器，避免与内部 `img` 叠 filter）。 */
export const FILTER_MEDIA_COMPENSATE_SELECTOR = [
  'img',
  'video',
  'audio',
  'canvas',
  'object',
  'embed',
  'iframe',
  '[role="img"]',
  `svg:not(#${FILTER_PLUS_SVG_HOST_ID})`,
].join(', ')

export function isFilterMediaCompensationTarget(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.id === FILTER_PLUS_SVG_HOST_ID) return false
  if (el.matches(FILTER_MEDIA_COMPENSATE_SELECTOR)) return true
  return false
}

/** 对单个媒体节点写入补偿 filter（备份原 inline filter）。 */
export function applyFilterMediaCompensationElement(
  el: HTMLElement,
  kind: FilterMediaCompensationKind,
): boolean {
  if (!isFilterMediaCompensationTarget(el)) return false
  if (el.getAttribute(FILTER_MEDIA_FILTER_BACKUP_ATTR) !== null) return false

  const value = filterMediaCompensationFilterValue(kind)
  el.setAttribute(FILTER_MEDIA_FILTER_BACKUP_ATTR, el.style.filter || '')
  el.style.setProperty('-webkit-filter', value, 'important')
  el.style.setProperty('filter', value, 'important')
  return true
}

export function restoreFilterMediaCompensationElement(el: HTMLElement): boolean {
  const backup = el.getAttribute(FILTER_MEDIA_FILTER_BACKUP_ATTR)
  if (backup === null) return false
  if (backup) {
    el.style.setProperty('filter', backup)
    el.style.setProperty('-webkit-filter', backup)
  } else {
    el.style.removeProperty('filter')
    el.style.removeProperty('-webkit-filter')
  }
  el.removeAttribute(FILTER_MEDIA_FILTER_BACKUP_ATTR)
  return true
}

export function applyFilterMediaCompensationInSubtree(
  root: ParentNode,
  kind: FilterMediaCompensationKind,
): number {
  let applied = 0
  for (const node of Array.from(root.querySelectorAll(FILTER_MEDIA_COMPENSATE_SELECTOR))) {
    if (!(node instanceof HTMLElement)) continue
    if (applyFilterMediaCompensationElement(node, kind)) applied += 1
  }
  return applied
}

export function restoreFilterMediaCompensationInSubtree(root: ParentNode): number {
  const selector = `[${FILTER_MEDIA_FILTER_BACKUP_ATTR}]`
  let restored = 0
  for (const node of Array.from(root.querySelectorAll(selector))) {
    if (node instanceof HTMLElement && restoreFilterMediaCompensationElement(node)) {
      restored += 1
    }
  }
  return restored
}

export function applyFilterMediaCompensationInDocument(
  doc: Document = document,
  kind: FilterMediaCompensationKind,
): number {
  return applyFilterMediaCompensationInSubtree(doc.documentElement, kind)
}

export function restoreFilterMediaCompensationInDocument(
  doc: Document = document,
): number {
  return restoreFilterMediaCompensationInSubtree(doc.documentElement)
}
