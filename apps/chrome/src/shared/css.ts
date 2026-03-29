import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_FG,
  FILTER_CSS_INVERT_CHAIN,
  ROOT_ATTR,
  STYLE_ELEMENT_CUSTOM_CSS_ID,
  STYLE_ELEMENT_ID,
  STYLE_ELEMENT_TYPOGRAPHY_ID,
} from './constants'
import { sanitizeSiteCustomCss } from './site-custom-css'
import {
  type ThemeFiltersStateV1,
  buildThemeFilterValue,
  clampThemeFilters,
  isIdentityThemeFilters,
} from './theme-filters'

/** 根据 WASM 计算出的颜色生成最小侵入的全局样式；可选 RFC 011 `filter` 链。 */
export function buildDarkCss(
  pageBg: string,
  pageFg: string,
  themeFilters?: ThemeFiltersStateV1,
): string {
  const tf = themeFilters ? clampThemeFilters(themeFilters) : undefined
  const filterBlock =
    tf && !isIdentityThemeFilters(tf)
      ? `filter: ${buildThemeFilterValue(tf)} !important;`
      : ''

  return `
    :root {
      ${CSS_VAR_PAGE_BG}: ${pageBg};
      ${CSS_VAR_PAGE_FG}: ${pageFg};
      --cd-scrollbar-track: color-mix(in srgb, var(${CSS_VAR_PAGE_BG}) 88%, black);
      --cd-scrollbar-thumb: color-mix(in srgb, var(${CSS_VAR_PAGE_FG}) 45%, var(${CSS_VAR_PAGE_BG}));
      color-scheme: dark !important;
    }
    html[${ROOT_ATTR}] {
      background-color: ${pageBg} !important;
      color: ${pageFg} !important;
      ${filterBlock}
      scrollbar-width: thin;
      scrollbar-color: var(--cd-scrollbar-thumb) var(--cd-scrollbar-track);
    }
    html[${ROOT_ATTR}]::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    html[${ROOT_ATTR}]::-webkit-scrollbar-track {
      background: var(--cd-scrollbar-track);
    }
    html[${ROOT_ATTR}]::-webkit-scrollbar-thumb {
      background: var(--cd-scrollbar-thumb);
      border-radius: 6px;
      border: 2px solid var(--cd-scrollbar-track);
    }
    html[${ROOT_ATTR}] body {
      background-color: ${pageBg} !important;
      color: ${pageFg} !important;
    }
  `
}

/**
 * Filter 类路径无 `--cd-page-*`，使用 Solarized 系滚动条与 `color-scheme: dark` 一致。
 */
export function buildFilterScrollbarCss(): string {
  const sel = `html[${ROOT_ATTR}]`
  return `
    ${sel} {
      --cd-scrollbar-track: #002b36;
      --cd-scrollbar-thumb: #586e75;
      scrollbar-width: thin;
      scrollbar-color: var(--cd-scrollbar-thumb) var(--cd-scrollbar-track);
    }
    ${sel}::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    ${sel}::-webkit-scrollbar-track {
      background: var(--cd-scrollbar-track);
    }
    ${sel}::-webkit-scrollbar-thumb {
      background: var(--cd-scrollbar-thumb);
      border-radius: 6px;
      border: 2px solid var(--cd-scrollbar-track);
    }
  `
}

/**
 * RFC 013：整页反相 + 可选 RFC 011 滤镜链（顺序：反相链 → brightness → contrast → sepia → saturate）。
 * `img`/`video`/`canvas`/`svg`/`picture` 使用与根相同的反相链抵消整页反相对媒体的染色。
 * 跨域 iframe 内文档无法由本脚本注入样式，见 RFC 013 文档说明。
 */
export function buildFilterInvertCss(themeFilters?: ThemeFiltersStateV1): string {
  const tf = themeFilters ? clampThemeFilters(themeFilters) : undefined
  const themeTail =
    tf && !isIdentityThemeFilters(tf) ? ` ${buildThemeFilterValue(tf)}` : ''
  const rootFilter = `${FILTER_CSS_INVERT_CHAIN}${themeTail}`

  return `
    :root {
      color-scheme: dark !important;
    }
    html[${ROOT_ATTR}] {
      filter: ${rootFilter} !important;
    }
    ${buildFilterScrollbarCss()}
    html[${ROOT_ATTR}] img,
    html[${ROOT_ATTR}] picture,
    html[${ROOT_ATTR}] svg,
    html[${ROOT_ATTR}] video,
    html[${ROOT_ATTR}] canvas {
      filter: ${FILTER_CSS_INVERT_CHAIN} !important;
    }
  `
}

/**
 * RFC 015 / 018：浅层文本类选择器（无裸 `*`，降低与图标字体冲突概率）；Dynamic/Static 上色与描边复用。
 */
export const CD_TEXT_LIKE_SELECTORS =
  ':where(main, article, aside, section, nav, p, span, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, label, dd, dt, a, code, pre)' as const

/**
 * 常见块级/地标容器：站点常在 `main`/`section` 等上保留浅色背景，而字色继承自已变暗的 `body`（浅色字），
 * 造成「浅灰字叠白底」。对下列容器同步 `--page-bg`，与 `foreground_for_dark_background` 的假设一致。
 * 不含裸 `div`，避免把卡片式布局打成整块色板；纯 div 站可依赖 RFC 019 自定义 CSS。
 */
export const CD_BLOCK_BACKGROUND_SELECTORS =
  ':where(main, article, aside, section, nav, header, footer, [role="main"])' as const

/**
 * 在 `buildDarkCss` 之上为常见文本节点强制 `color`（`!important`），覆盖站点 author 规则。
 * **Dynamic 与 Static（WASM 着色路径）均使用本函数**，与仅含 html/body 的 `buildDarkCss` 区分。
 * RFC 011：非中性滤镜仍在 `html[ROOT_ATTR]` 根上。
 */
export function buildStaticDarkCss(
  pageBg: string,
  pageFg: string,
  themeFilters?: ThemeFiltersStateV1,
): string {
  const base = buildDarkCss(pageBg, pageFg, themeFilters)
  return `${base}
    html[${ROOT_ATTR}] ${CD_TEXT_LIKE_SELECTORS} {
      color: var(${CSS_VAR_PAGE_FG}) !important;
    }
    html[${ROOT_ATTR}] ${CD_BLOCK_BACKGROUND_SELECTORS} {
      background-color: var(${CSS_VAR_PAGE_BG}) !important;
    }
  `
}

/** 将样式写入页面，若已存在则更新文本内容。 */
export function ensureStyleElement(cssText: string): void {
  const doc = document.documentElement
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ELEMENT_ID
    // document_start：尽量插在 head 之前也可行，优先 head。
    ;(document.head ?? doc).appendChild(el)
  }
  el.textContent = cssText
}

/**
 * RFC 018：第二条样式节点；`cssText` 为空或仅空白时移除节点。
 */
export function ensureTypographyStyleElement(cssText: string): void {
  const trimmed = cssText.trim()
  if (!trimmed) {
    document.getElementById(STYLE_ELEMENT_TYPOGRAPHY_ID)?.remove()
    return
  }
  const doc = document.documentElement
  let el = document.getElementById(STYLE_ELEMENT_TYPOGRAPHY_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ELEMENT_TYPOGRAPHY_ID
    ;(document.head ?? doc).appendChild(el)
  }
  el.textContent = trimmed
}

/**
 * RFC 019：每站用户 CSS；`cssText` 为空时移除节点。经 `sanitizeSiteCustomCss` 后再写入。
 */
export function ensureCustomCssStyleElement(cssText: string): void {
  const trimmed = sanitizeSiteCustomCss(cssText).trim()
  if (!trimmed) {
    document.getElementById(STYLE_ELEMENT_CUSTOM_CSS_ID)?.remove()
    return
  }
  const doc = document.documentElement
  let el = document.getElementById(STYLE_ELEMENT_CUSTOM_CSS_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ELEMENT_CUSTOM_CSS_ID
    ;(document.head ?? doc).appendChild(el)
  }
  el.textContent = trimmed
}
