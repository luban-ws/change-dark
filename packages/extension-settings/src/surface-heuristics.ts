/**
 * 跨站点浅色表面启发式（RFC 031+）：地标 / 组件 class / 大面积实色面板。
 * 替代站点硬编码 allowlist，供 content 铺底与视口采样共用。
 */

/** 页面地标 — 壳层根节点，铺底不破坏透明 layout。 */
export const CD_SURFACE_LANDMARK_SELECTORS = [
  'body',
  'main',
  'header',
  'footer',
  '[role="main"]',
  '[role="banner"]',
  '[role="contentinfo"]',
].join(', ') as const

/**
 * 设计系统「组件壳」class 线索（BEM `__bar` / `__box`、`*-footer`、hero 等）。
 * 不匹配裸 `h-c-page` / `grid` 等 layout wrapper。
 */
export const SURFACE_COMPONENT_CLASS_HINT_RE =
  /__(?:bar|box|tile|panel|card|sheet|strip|banner|footer|header)\b|(?:^|[\s_-])(?:footer|header|hero|banner|navbar|topbar|toolbar|masthead)(?:$|[\s_-])/i

/** 视口内实色浅底面板：面积与最小边长门槛，过滤按钮级小块。 */
export const MIN_SIGNIFICANT_SURFACE_AREA_PX = 8_000
export const MIN_SIGNIFICANT_SURFACE_WIDTH_PX = 120
export const MIN_SIGNIFICANT_SURFACE_HEIGHT_PX = 40

export function isSurfaceLandmark(el: HTMLElement): boolean {
  if (el === el.ownerDocument.body) return true
  const tag = el.tagName
  if (tag === 'MAIN' || tag === 'HEADER' || tag === 'FOOTER') return true
  return el.matches('[role="main"], [role="banner"], [role="contentinfo"]')
}

export function hasSurfaceComponentClassHint(el: HTMLElement): boolean {
  const cls = el.className
  if (typeof cls !== 'string' || !cls.trim()) return false
  return SURFACE_COMPONENT_CLASS_HINT_RE.test(cls)
}

export function elementVisibleFillArea(el: HTMLElement): number {
  const r = el.getBoundingClientRect()
  return Math.max(0, r.width) * Math.max(0, r.height)
}

export function elementIntersectsViewport(
  el: HTMLElement,
  doc: Document = el.ownerDocument,
): boolean {
  const r = el.getBoundingClientRect()
  const h = doc.documentElement.clientHeight
  const w = doc.documentElement.clientWidth
  return r.bottom > 0 && r.right > 0 && r.top < h && r.left < w
}

/** 视口内、面积足够大的块级容器（通用 section / 大白底 div）。 */
export function isSignificantVisibleLightPanel(el: HTMLElement): boolean {
  if (!elementIntersectsViewport(el)) return false
  if (elementVisibleFillArea(el) < MIN_SIGNIFICANT_SURFACE_AREA_PX) return false
  const r = el.getBoundingClientRect()
  return (
    r.width >= MIN_SIGNIFICANT_SURFACE_WIDTH_PX &&
    r.height >= MIN_SIGNIFICANT_SURFACE_HEIGHT_PX
  )
}
