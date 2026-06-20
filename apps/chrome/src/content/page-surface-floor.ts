/**
 * 页面壳层铺底：body + policy 地标（实色浅底）。
 */

import {
  clearLightSurfacePaint,
  hasOpaqueLightFill,
  paintLightSurface,
  SURFACE_FLOOR_ATTR,
} from './light-surface-utils'
import { getActiveSitePolicy } from './site-policy'

/** 无条件铺 body；policy 地标仅在实色浅底时铺底（颜色来自 preset CSS 变量）。 */
export function applyPageSurfaceFloor(doc: Document): void {
  if (doc.body) paintLightSurface(doc.body)

  const { landmarkSelectorList } = getActiveSitePolicy().surfaceRepair
  if (!landmarkSelectorList) return

  for (const node of doc.querySelectorAll(landmarkSelectorList)) {
    if (!(node instanceof HTMLElement)) continue
    if (node === doc.body) continue
    if (node.hasAttribute(SURFACE_FLOOR_ATTR)) continue
    if (!hasOpaqueLightFill(node)) continue
    paintLightSurface(node)
  }
}

export function clearPageSurfaceFloor(doc: Document): void {
  for (const node of doc.querySelectorAll(`[${SURFACE_FLOOR_ATTR}]`)) {
    if (node instanceof HTMLElement) clearLightSurfacePaint(node)
  }
}
