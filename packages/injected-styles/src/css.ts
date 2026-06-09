import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_FG,
  ROOT_ATTR,
  STYLE_ELEMENT_CUSTOM_CSS_ID,
  STYLE_ELEMENT_ID,
  STYLE_ELEMENT_TYPOGRAPHY_ID,
  sanitizeSiteCustomCss,
  type ThemeFiltersStateV1,
  buildThemeFilterValue,
  clampThemeFilters,
  isIdentityThemeFilters,
  CD_TEXT_LIKE_SELECTORS,
  CD_BLOCK_BACKGROUND_SELECTORS,
  CD_MEDIA_ELEMENT_SELECTORS,
} from '@luban-ws/extension-settings'

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

/**
 * RFC 031 Dynamic 主路径：逐规则改色覆盖层 + 可选 RFC 011 主题滤镜（挂在 body，不挂 html）。
 */
export function buildRecolorShellCss(themeFilters?: ThemeFiltersStateV1): string {
  const tf = themeFilters ? clampThemeFilters(themeFilters) : undefined
  const filterBlock =
    tf && !isIdentityThemeFilters(tf)
      ? `filter: ${buildThemeFilterValue(tf)} !important;`
      : ''
  const bodyFilterRule = filterBlock
    ? `
    html[${ROOT_ATTR}] body {
      ${filterBlock}
    }`
    : ''

  return `
    html[${ROOT_ATTR}] {
      color-scheme: dark !important;
    }${bodyFilterRule}
  `.trim()
}

/**
 * Dynamic：媒体元素不参与改色/filter 注入（对齐 DR「照片不动」）。
 */
export function buildRecolorMediaProtectCss(): string {
  const sel = `html[${ROOT_ATTR}] ${CD_MEDIA_ELEMENT_SELECTORS}`
  return `
    ${sel} {
      filter: none !important;
    }
  `.trim()
}

/** 壳层 + 媒体保护 + RFC 031 改色覆盖 CSS（`buildRecolorOverrideStylesheet` 输出）。 */
export function buildRecolorDynamicCss(
  overrideCss: string,
  themeFilters?: ThemeFiltersStateV1,
): string {
  const shell = buildRecolorShellCss(themeFilters)
  const mediaProtect = buildRecolorMediaProtectCss()
  const body = overrideCss.trim()
  const parts = [shell, mediaProtect, body].filter(Boolean)
  return parts.join('\n\n')
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
