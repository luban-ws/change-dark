/**
 * 固定顶栏（header bar / product nav）同步铺底 — 不依赖 scroll resweep。
 * 视口网格首行通常在 y≈12% 处，会漏掉 64–128px 高的 fixed header。
 */

import type { SamplingBudget } from '@change-dark/extension-settings'

import {
  paintLightSurface,
  shouldPaintOpaqueLightSurface,
  SURFACE_FLOOR_ATTR,
} from './light-surface-utils'
import { getActiveSitePolicy } from './site-policy'

/** 常见 fixed/sticky 顶栏 class（GMP / Google Marketing 设计系统）。 */
const FIXED_CHROME_QUERY = [
  '.h-c-header__bar',
  '.gmp-header__bar',
  '[class*="header__bar"]',
  '.gmp-product-nav',
].join(', ')

function tryPaintChromeBar(
  el: HTMLElement,
  touched: Set<HTMLElement>,
): boolean {
  if (touched.has(el) || el.hasAttribute(SURFACE_FLOOR_ATTR)) return false
  const policy = getActiveSitePolicy().surfaceRepair
  const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
  if (!shouldPaintOpaqueLightSurface(el, policy, styleCache)) return false
  paintLightSurface(el)
  touched.add(el)
  return true
}

/** 同步扫描 fixed 顶栏；预算极小，专补首屏 header。 */
export function sweepFixedChromeSurfaces(
  doc: Document,
  _budget?: SamplingBudget,
): number {
  const touched = new Set<HTMLElement>()
  let count = 0
  for (const node of doc.querySelectorAll(FIXED_CHROME_QUERY)) {
    if (node instanceof HTMLElement && tryPaintChromeBar(node, touched)) {
      count += 1
    }
  }
  return count
}
