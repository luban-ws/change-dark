import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_FG,
  ROOT_ATTR,
  STYLE_ELEMENT_ID,
} from './constants'
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
      color-scheme: dark !important;
    }
    html[${ROOT_ATTR}] {
      background-color: ${pageBg} !important;
      color: ${pageFg} !important;
      ${filterBlock}
    }
    html[${ROOT_ATTR}] body {
      background-color: ${pageBg} !important;
      color: ${pageFg} !important;
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
