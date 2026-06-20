import {
  CD_MEDIA_ELEMENT_SELECTORS,
  elementIntersectsViewport,
  elementVisibleFillArea,
  hasSurfaceComponentClassHint,
  isSurfaceLandmark,
  THEME_PAGE_BACKGROUND_CSS,
} from '@change-dark/extension-settings'
import type { ResolvedSurfaceRepairPolicy } from '@change-dark/site-catalog'
import { DEFAULT_SURFACE_REPAIR_POLICY } from '@change-dark/site-catalog'
import { parseCssRgbToTriplet } from '@change-dark/dynamic-recolor'

/** 标记由扩展 inline 铺底的节点，便于关闭时清理。 */
export const SURFACE_FLOOR_ATTR = 'data-change-dark-surface-floor'

/** 高于此亮度（0..255 sRGB 加权）视为未暗化的浅底。 */
export const LIGHT_SURFACE_LUMA = 200

/** 低于此 alpha 视为透明 — 不铺底。 */
export const OPAQUE_ALPHA_MIN = 0.92

export function relativeSurfaceLuma(rgb: readonly [number, number, number]): number {
  return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!
}

export function parseBackgroundAlpha(input: string): number {
  const color = input.trim().toLowerCase()
  if (!color || color === 'transparent') return 0
  if (color.startsWith('rgba(')) {
    const alphaPart = color.slice(color.lastIndexOf(',') + 1, -1).trim()
    if (alphaPart.endsWith('%')) return parseFloat(alphaPart) / 100
    const alpha = parseFloat(alphaPart)
    return Number.isFinite(alpha) ? alpha : 1
  }
  return 1
}

/** jsdom / 部分环境 computed background 为空时回退 inline style。 */
function readInlineBackgroundColor(el: HTMLElement): string {
  const direct = el.style.backgroundColor?.trim()
  if (direct) return direct
  const bg = el.style.background?.trim()
  if (!bg || bg === 'transparent') return bg ?? ''
  if (/^(rgb|rgba|#|hsl)/i.test(bg)) return bg
  return ''
}

function resolveAuthorBackgroundColor(el: HTMLElement, cs: CSSStyleDeclaration): string {
  const inline = readInlineBackgroundColor(el)
  // 元素自身 inline 背景优先 — jsdom/Linux 常给出错误的 inherited computed（如 rgb(0,0,0)）。
  if (inline) return inline
  return cs.backgroundColor?.trim() ?? ''
}

export function shouldSkipLightSurfaceTarget(el: HTMLElement): boolean {
  if (el.matches(CD_MEDIA_ELEMENT_SELECTORS)) return true
  if (el.matches('input, textarea, select, option')) return true
  if (el.matches('button, [role="button"], a.h-c-button, .h-c-button, .glue-button')) return true
  return false
}

export function hasAuthorBackgroundImage(
  el: HTMLElement,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  const cs = styleCache?.get(el) ?? getComputedStyle(el)
  if (styleCache && !styleCache.has(el)) styleCache.set(el, cs)
  const bgImage = cs.backgroundImage?.trim()
  return Boolean(bgImage && bgImage !== 'none')
}

export function isTransparentLayoutSurface(
  el: HTMLElement,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (shouldSkipLightSurfaceTarget(el)) return true
  if (hasAuthorBackgroundImage(el, styleCache)) return true
  const cs = styleCache?.get(el) ?? getComputedStyle(el)
  if (styleCache && !styleCache.has(el)) styleCache.set(el, cs)
  return parseBackgroundAlpha(resolveAuthorBackgroundColor(el, cs)) < OPAQUE_ALPHA_MIN
}

export function hasOpaqueLightFill(
  el: HTMLElement,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (isTransparentLayoutSurface(el, styleCache)) return false
  const cs = styleCache?.get(el) ?? getComputedStyle(el)
  if (styleCache && !styleCache.has(el)) styleCache.set(el, cs)
  const triplet = parseCssRgbToTriplet(resolveAuthorBackgroundColor(el, cs))
  if (!triplet) return false
  return relativeSurfaceLuma(triplet) > LIGHT_SURFACE_LUMA
}

function matchesNeverPaint(el: HTMLElement, policy: ResolvedSurfaceRepairPolicy): boolean {
  if (!policy.neverPaintSelectorList) return false
  return el.matches(policy.neverPaintSelectorList)
}

function isPolicyLandmark(el: HTMLElement, policy: ResolvedSurfaceRepairPolicy): boolean {
  if (isSurfaceLandmark(el)) return true
  if (!policy.landmarkSelectorList) return false
  return el.matches(policy.landmarkSelectorList)
}

function hasPolicyComponentClassHint(
  el: HTMLElement,
  policy: ResolvedSurfaceRepairPolicy,
): boolean {
  const cls = el.className
  if (typeof cls !== 'string' || !cls.trim()) return false
  if (hasSurfaceComponentClassHint(el)) return true
  return policy.componentClassHintRe.test(cls)
}

function isPolicySignificantVisibleLightPanel(
  el: HTMLElement,
  policy: ResolvedSurfaceRepairPolicy,
): boolean {
  if (!elementIntersectsViewport(el)) return false
  if (elementVisibleFillArea(el) < policy.minPanelAreaPx) return false
  const r = el.getBoundingClientRect()
  return r.width >= policy.minPanelWidthPx && r.height >= policy.minPanelHeightPx
}

export function shouldPaintOpaqueLightSurface(
  el: HTMLElement,
  policy: ResolvedSurfaceRepairPolicy = DEFAULT_SURFACE_REPAIR_POLICY,
  styleCache?: Map<HTMLElement, CSSStyleDeclaration>,
): boolean {
  if (matchesNeverPaint(el, policy)) return false
  if (!hasOpaqueLightFill(el, styleCache)) return false
  if (isPolicyLandmark(el, policy)) return true
  if (hasPolicyComponentClassHint(el, policy)) return true
  if (isPolicySignificantVisibleLightPanel(el, policy)) return true
  return false
}

export function paintLightSurface(el: HTMLElement): void {
  el.setAttribute(SURFACE_FLOOR_ATTR, '')
  el.style.setProperty('background-color', THEME_PAGE_BACKGROUND_CSS, 'important')
}

export function clearLightSurfacePaint(el: HTMLElement): void {
  el.removeAttribute(SURFACE_FLOOR_ATTR)
  el.style.removeProperty('background-color')
  el.style.removeProperty('background')
}
