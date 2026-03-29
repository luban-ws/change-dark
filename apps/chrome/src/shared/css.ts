import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_FG,
  ROOT_ATTR,
  STYLE_ELEMENT_ID,
} from './constants'

/** 根据 WASM 计算出的颜色生成最小侵入的全局样式。 */
export function buildDarkCss(pageBg: string, pageFg: string): string {
  return `
    :root {
      ${CSS_VAR_PAGE_BG}: ${pageBg};
      ${CSS_VAR_PAGE_FG}: ${pageFg};
      color-scheme: dark !important;
    }
    html[${ROOT_ATTR}] {
      background-color: ${pageBg} !important;
      color: ${pageFg} !important;
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
