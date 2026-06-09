/**
 * RFC 014：SVG filter 路径（反相 + hue-rotate 180°），语义对齐 RFC 013 的 CSS 链。
 * 非 Chromium / 注入失败时由调用方降级为 `buildFilterInvertCss`。
 */

import {
  FILTER_PLUS_SVG_FILTER_ID,
  FILTER_PLUS_SVG_HOST_ID,
  ROOT_ATTR,
} from './constants'
import {
  buildFilterInvertMediaSelectorList,
  buildFilterScrollbarCss,
  resolveFilterCssInjectionScope,
} from './css'
import {
  SOLARIZED_PAGE_BG_CSS,
  SOLARIZED_PAGE_FG_CSS,
  type PagePalette,
} from './page-palette'
import {
  type ThemeFiltersStateV1,
  buildThemeFilterValue,
  clampThemeFilters,
  isIdentityThemeFilters,
} from './theme-filters'

const SVG_NS = 'http://www.w3.org/2000/svg' as const

/** feColorMatrix：RGB 取反并平移（等价于 CSS invert(1) 的 sRGB 近似）。 */
const FE_COLOR_MATRIX_INVERT = '-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0' as const

/**
 * Help：Firefox 上 SVG Filter+ 表现差；嫦娥为 Chromium 系扩展，仅对非 Firefox 暴露 UI。
 * 内容脚本在 Firefox 等环境仍可将存储中的 `filter-plus` 降级为 CSS Filter。
 */
export function shouldExposeFilterPlusMode(): boolean {
  if (typeof navigator === 'undefined') return false
  return !/firefox/i.test(navigator.userAgent)
}

/**
 * 在页面中挂入隐藏 SVG defs；已存在则跳过。失败返回 false（调用方应降级）。
 */
export function ensureFilterPlusSvg(doc: Document): boolean {
  try {
    if (doc.getElementById(FILTER_PLUS_SVG_HOST_ID)) return true
    const body = doc.body
    if (!body) return false

    const svg = doc.createElementNS(SVG_NS, 'svg')
    svg.id = FILTER_PLUS_SVG_HOST_ID
    svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;visibility:hidden'

    const defs = doc.createElementNS(SVG_NS, 'defs')
    const filter = doc.createElementNS(SVG_NS, 'filter')
    filter.setAttribute('id', FILTER_PLUS_SVG_FILTER_ID)
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')

    const feMat = doc.createElementNS(SVG_NS, 'feColorMatrix')
    feMat.setAttribute('in', 'SourceGraphic')
    feMat.setAttribute('type', 'matrix')
    feMat.setAttribute('values', FE_COLOR_MATRIX_INVERT)
    feMat.setAttribute('result', 'inv')

    const feHue = doc.createElementNS(SVG_NS, 'feHueRotate')
    feHue.setAttribute('in', 'inv')
    feHue.setAttribute('angle', '180')

    filter.appendChild(feMat)
    filter.appendChild(feHue)
    defs.appendChild(filter)
    svg.appendChild(defs)
    body.appendChild(svg)
    return true
  } catch {
    return false
  }
}

/** 切换离 Filter+ 时移除 SVG，避免 `url(#id)` 残留。 */
export function removeFilterPlusSvg(doc: Document): void {
  doc.getElementById(FILTER_PLUS_SVG_HOST_ID)?.remove()
}

/**
 * 根节点：`url(#id)` + 可选 RFC 011；媒体仅 `url(#id)` 以抵消整页基链（与 RFC 013 同理）。
 * Solarized 时与 `buildFilterInvertCss` 一致：`html` 壳色、`body` 上基链，媒体前缀对齐。
 */
export function buildFilterPlusCss(
  themeFilters?: ThemeFiltersStateV1,
  pagePalette?: PagePalette,
): string {
  const tf = themeFilters ? clampThemeFilters(themeFilters) : undefined
  const themeTail =
    tf && !isIdentityThemeFilters(tf) ? ` ${buildThemeFilterValue(tf)}` : ''
  const rootFilter = `url(#${FILTER_PLUS_SVG_FILTER_ID})${themeTail}`
  const { htmlRoot, mediaScope, filterCascadeTarget, useSolarizedHtmlShell } =
    resolveFilterCssInjectionScope(pagePalette)
  const svgSel = `svg:not(#${FILTER_PLUS_SVG_HOST_ID})`
  const mediaSelectors = buildFilterInvertMediaSelectorList(mediaScope, svgSel)

  if (useSolarizedHtmlShell) {
    return `
    :root {
      color-scheme: dark !important;
    }
    ${htmlRoot} {
      background-color: ${SOLARIZED_PAGE_BG_CSS} !important;
      color: ${SOLARIZED_PAGE_FG_CSS} !important;
      min-height: 100%;
    }
    ${filterCascadeTarget} {
      filter: ${rootFilter} !important;
      min-height: 100%;
    }
    ${buildFilterScrollbarCss()}
    ${mediaSelectors} {
      filter: url(#${FILTER_PLUS_SVG_FILTER_ID}) !important;
    }
  `
  }

  return `
    :root {
      color-scheme: dark !important;
    }
    ${filterCascadeTarget} {
      filter: ${rootFilter} !important;
    }
    ${buildFilterScrollbarCss()}
    ${mediaSelectors} {
      filter: url(#${FILTER_PLUS_SVG_FILTER_ID}) !important;
    }
  `
}
