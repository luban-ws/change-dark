/**
 * RFC 0031：Dynamic 改色样式注入（stylesheet 覆盖 + 壳层）。
 */

import {
  ROOT_ATTR,
  STYLE_ELEMENT_ID,
  type ThemeFiltersStateV1,
} from '@change-dark/extension-settings'
import {
  buildRecolorDynamicCss,
  buildThemePaletteShellCss,
  ensureStyleElement,
} from '@change-dark/injected-styles'
import {
  buildRecolorOverrideStylesheet,
  type RecolorStylesheetOptions,
} from './css-stylesheet'
import { buildCssVariableGraph } from './css-variable-graph'
import { DEFAULT_DARK_PROFILE, type ColorProfile } from './modify-colors'
import {
  SHADOW_STYLE_OWNED_ATTR,
  collectReadableStylesheetCssTexts,
  type StyleRoot,
} from './stylesheet-collect'

export interface RecolorInjectionBuildResult {
  overrideCss: string
  cssText: string
  variableGraphBudgetExceeded?: boolean
}

export interface RootRecolorInjectionBuildResult
  extends RecolorInjectionBuildResult {
  adoptedSheets: CSSStyleSheet[]
}

/** 从已收集的 CSS 文本生成覆盖层（避免重复遍历 `styleSheets`）。 */
export function buildRecolorInjectionFromSource(
  sourceCss: string,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  options: RecolorStylesheetOptions = {},
): RecolorInjectionBuildResult {
  let variableGraphBudgetExceeded = false
  let overrideCss = ''
  if (sourceCss.trim()) {
    const graph =
      options.variableGraph ??
      buildCssVariableGraph(sourceCss, {
        maxMs: options.variableGraphMaxMs,
        now: options.now,
      })
    variableGraphBudgetExceeded = graph.stats.budgetExceeded
    overrideCss = buildRecolorOverrideStylesheet(sourceCss, profile, {
      ...options,
      variableGraph: graph,
    })
  }
  const cssText =
    options.selectorMode === 'shadow'
      ? overrideCss
      : buildRecolorDynamicCss(overrideCss, themeFilters)
  return { overrideCss, cssText, variableGraphBudgetExceeded }
}

/** 从可读 stylesheet 生成覆盖 CSS 与完整注入文本（不写 DOM）。 */
export function buildRecolorInjection(
  doc: Document,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  options: RecolorStylesheetOptions = {},
): RecolorInjectionBuildResult {
  const { cssChunks } = collectReadableStylesheetCssTexts(doc)
  return buildRecolorInjectionFromSource(
    cssChunks.join('\n\n'),
    themeFilters,
    profile,
    options,
  )
}

function isDocumentRoot(root: StyleRoot): root is Document {
  return 'documentElement' in root
}

/** RFC 0037：为 `Document | ShadowRoot` 构建改色覆盖层并返回该 root 的 `adoptedStyleSheets`。 */
export function buildRecolorInjectionForRoot(
  root: StyleRoot,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  options: RecolorStylesheetOptions = {},
): RootRecolorInjectionBuildResult {
  const { cssChunks, adoptedSheets } = collectReadableStylesheetCssTexts(root)
  const sourceCss = cssChunks.join('\n\n')
  if (isDocumentRoot(root)) {
    const build = buildRecolorInjectionFromSource(
      sourceCss,
      themeFilters,
      profile,
      options,
    )
    return { ...build, adoptedSheets }
  }
  const build = buildRecolorInjectionFromSource(
    sourceCss,
    themeFilters,
    profile,
    { ...options, selectorMode: 'shadow' },
  )
  return { ...build, adoptedSheets }
}

const OWNED_SHADOW_STYLE_SELECTOR = `style[${SHADOW_STYLE_OWNED_ATTR}="1"], style#${STYLE_ELEMENT_ID}`

/** RFC 0037：在单个 ShadowRoot 内创建/更新扩展自有 `<style>`；空文本时移除。 */
export function ensureShadowStyleElement(
  shadowRoot: ShadowRoot,
  cssText: string,
): HTMLStyleElement | null {
  const existing = shadowRoot.querySelector(
    OWNED_SHADOW_STYLE_SELECTOR,
  ) as HTMLStyleElement | null
  if (!cssText.trim()) {
    existing?.remove()
    return null
  }
  const ownerDoc = shadowRoot.ownerDocument ?? document
  const el = existing ?? ownerDoc.createElement('style')
  if (el.id !== STYLE_ELEMENT_ID) el.id = STYLE_ELEMENT_ID
  if (el.getAttribute(SHADOW_STYLE_OWNED_ATTR) !== '1') {
    el.setAttribute(SHADOW_STYLE_OWNED_ATTR, '1')
  }
  if (el.textContent !== cssText) {
    el.textContent = cssText
  }
  if (shadowRoot.lastElementChild !== el) {
    shadowRoot.appendChild(el)
  }
  return el
}

/** RFC 0037：仅移除 ShadowRoot 内本扩展拥有的覆盖 `<style>`。 */
export function removeShadowStyleElement(shadowRoot: ShadowRoot): void {
  for (const el of Array.from(shadowRoot.querySelectorAll(OWNED_SHADOW_STYLE_SELECTOR))) {
    el.remove()
  }
}

/** 采样铺底 + 改色壳层 + 主题壳（主题壳必须最后，压过 WASM 改色字面量）。 */
export function mergeRecolorStyleText(baseCss: string, dynamicCss: string): string {
  const base = baseCss.trim()
  const dynamic = dynamicCss.trim()
  const themeShell = buildThemePaletteShellCss()
  return [base, dynamic, themeShell].filter(Boolean).join('\n\n')
}

/** 写入已构建的改色层（不再重复收集 stylesheet）。 */
export function applyRecolorInjectionFromBuild(
  doc: Document,
  build: RecolorInjectionBuildResult,
  baseCss = '',
): string {
  doc.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(mergeRecolorStyleText(baseCss, build.cssText))
  return build.overrideCss
}

/** 注入/更新改色 `<style>` 并标记 `ROOT_ATTR`。`baseCss` 为 Dynamic 采样铺底，MO 重建时须保留。 */
export function applyRecolorInjection(
  doc: Document,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  baseCss = '',
  options: RecolorStylesheetOptions = {},
): string {
  const build = buildRecolorInjection(doc, themeFilters, profile, options)
  return applyRecolorInjectionFromBuild(doc, build, baseCss)
}

/** RFC 0037：统一面向 `Document | ShadowRoot` 的注入入口。 */
export function applyRecolorInjectionForRoot(
  root: StyleRoot,
  themeFilters: ThemeFiltersStateV1,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  baseCss = '',
  options: RecolorStylesheetOptions = {},
): string {
  if (isDocumentRoot(root)) {
    return applyRecolorInjection(root, themeFilters, profile, baseCss, options)
  }
  const build = buildRecolorInjectionForRoot(root, themeFilters, profile, options)
  ensureShadowStyleElement(root, build.overrideCss)
  return build.overrideCss
}
