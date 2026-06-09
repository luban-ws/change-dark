import {
  batch_mix_toward_black,
  mix_toward_black,
  suggested_foreground_for_dark_bg,
} from '@luban-ws/dark-engine'

import {
  scheduleIdleTask,
  whenDocumentComplete,
  whenDomReady,
} from './sampling'
import { paintRecolorPath, wasmRecolorAvailable } from './recolor-path'
import { resolveDynamicBaseRgbWithBranch } from './dynamic-fallback'
import {
  startRecolorDynamicObserver,
  stopRecolorDynamicObserver,
} from './recolor-observer'
import { scheduleBackgroundImageRecolor } from './recolor-background-images'
import type { SamplingBudget } from '@luban-ws/dark-shared'
import {
  buildFilterInvertCss,
  buildStaticDarkCss,
  ensureCustomCssStyleElement,
  ensureStyleElement,
  ensureTypographyStyleElement,
} from "@luban-ws/dark-shared"
import {
  buildFilterPlusCss,
  ensureFilterPlusSvg,
  removeFilterPlusSvg,
  restoreInlineStylesInDocument,
  restoreBackgroundImageFiltersInDocument,
  shouldExposeFilterPlusMode,
} from "@luban-ws/dark-shared"
import {
  MIX_TOWARD_BLACK_AMOUNT,
  ROOT_ATTR,
  STATIC_FALLBACK_RGB,
  STORAGE_KEYS_AFFECTING_INJECTION,
  STYLE_ELEMENT_ID,
  THEME_MODE_DYNAMIC,
  THEME_MODE_FILTER_CSS,
  THEME_MODE_FILTER_PLUS,
  THEME_MODE_STATIC,
  POLICY_AUTO,
  POLICY_ON,
} from "@luban-ws/dark-shared"
import {
  PAGE_PALETTE_SOLARIZED_DARK,
  SOLARIZED_PAGE_BG_CSS,
  SOLARIZED_PAGE_FG_CSS,
  type PagePalette,
} from "@luban-ws/dark-shared"
import { buildTypographyCss } from "@luban-ws/dark-shared"
import {
  isNativelyDarkFromHtmlBodyBackgrounds,
  readEffectivePagePaletteForPage,
  readEffectiveThemeForPage,
  readEffectiveTypographyForPage,
  readSamplingBudget,
  readShouldApplyForcedDarkForPage,
  readSiteCustomCssForPage,
  readGlobalPolicy,
  readAutoDarkThreshold,
} from "@luban-ws/dark-shared"
import type { ThemeFiltersStateV1 } from "@luban-ws/dark-shared"

/**
 * 内容脚本注入约定（实现须与 RFC 025 / 027 / 023 一致，避免「导入脚本」后漂移）：
 *
 * - **原生暗页**：**`auto`** → 不注入任何强制暗色（Dynamic / Static / Filter / Filter+ 均跳过）。**`on`** → Dynamic / Static 仍注入；**Filter / Filter+（反相族）不注入**，避免暗页被反相变亮。
 * - **页面调色板**：`readEffectivePagePaletteForPage()` 的 `dark` / `solarized-dark` 须传入所有依赖底字色的绘制路径（Static、Dynamic 的 `colorsForPalette`，Filter/Filter+ 的 `buildFilterInvertCss` / `buildFilterPlusCss`）；`dark` 走混合系色，`solarized-dark` 走 base03/base1，禁止在内容脚本侧写死忽略 palette。
 */

/**
 * 将 RGB 分量格式化为 CSS rgb()，避免魔法字符串散落。
 */
function rgb(parts: Uint8Array | number[]): string {
  const [r, g, b] = parts
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 从页面基色经 WASM 混合得到最终背景与建议前景（Dynamic / Static 共用）。
 */
function mixBackgroundAndForegroundFromBase(baseRgb: Uint8Array): { pageBg: string; pageFg: string } {
  let bgParts: Uint8Array
  try {
    bgParts = batch_mix_toward_black(baseRgb, MIX_TOWARD_BLACK_AMOUNT)
  } catch {
    bgParts = mix_toward_black(
      baseRgb[0]!,
      baseRgb[1]!,
      baseRgb[2]!,
      MIX_TOWARD_BLACK_AMOUNT,
    )
  }
  const fgParts = suggested_foreground_for_dark_bg(bgParts[0]!, bgParts[1]!, bgParts[2]!)
  return { pageBg: rgb(bgParts), pageFg: rgb(fgParts) }
}

/**
 * Solarized Dark 时忽略采样基色，使用固定 base03/base1。
 */
function colorsForPalette(
  palette: PagePalette,
  baseRgb: Uint8Array,
): { pageBg: string; pageFg: string } {
  if (palette === PAGE_PALETTE_SOLARIZED_DARK) {
    return { pageBg: SOLARIZED_PAGE_BG_CSS, pageFg: SOLARIZED_PAGE_FG_CSS }
  }
  return mixBackgroundAndForegroundFromBase(baseRgb)
}

/**
 * RFC 015：不采样、固定 `STATIC_FALLBACK_RGB` + `buildStaticDarkCss`；与 Dynamic 互斥，storage 变更时整页重绘。
 */
function paintStaticPath(themeFilters: ThemeFiltersStateV1, pagePalette: PagePalette): void {
  const baseRgb = new Uint8Array(STATIC_FALLBACK_RGB)
  const { pageBg, pageFg } = colorsForPalette(pagePalette, baseRgb)
  const css = buildStaticDarkCss(pageBg, pageFg, themeFilters)
  document.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(css)
}

/** RFC 023：Dynamic 采样单色回退（§3.1 `paintSampledFallbackPath`）。 */
function paintSampledFallbackPath(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
  budget: SamplingBudget,
): void {
  const { rgb: baseRgb } = resolveDynamicBaseRgbWithBranch(budget)
  const { pageBg, pageFg } = colorsForPalette(pagePalette, baseRgb)
  const css = buildStaticDarkCss(pageBg, pageFg, themeFilters)
  document.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(css)
}

/**
 * RFC 013：无 WASM / 无采样；整页 CSS 反相 + 媒体再反相，可与 RFC 011 链式组合。
 * `pagePalette` 必须与 Static/Dynamic 同源（如 Solarized 时壳色与反相作用域见 `buildFilterInvertCss`）。
 */
function paintFilterCssPath(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
): void {
  const css = buildFilterInvertCss(themeFilters, pagePalette)
  document.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(css)
}

/**
 * RFC 014：SVG `filter` + 失败或非 Chromium 时降级为 RFC 013。
 */
function paintFilterPlusPath(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
): void {
  if (!shouldExposeFilterPlusMode()) {
    paintFilterCssPath(themeFilters, pagePalette)
    return
  }
  try {
    if (!ensureFilterPlusSvg(document)) {
      paintFilterCssPath(themeFilters, pagePalette)
      return
    }
    const css = buildFilterPlusCss(themeFilters, pagePalette)
    document.documentElement.setAttribute(ROOT_ATTR, '')
    ensureStyleElement(css)
  } catch {
    paintFilterCssPath(themeFilters, pagePalette)
  }
}

/** 去掉强制暗色主样式与 Filter+ SVG，保留由 `finally` 注入的排版/自定义 CSS。 */
function clearForcedDarkSurface(): void {
  stopRecolorDynamicObserver()
  restoreBackgroundImageFiltersInDocument(document)
  restoreInlineStylesInDocument(document)
  document.documentElement.removeAttribute(ROOT_ATTR)
  document.getElementById(STYLE_ELEMENT_ID)?.remove()
  removeFilterPlusSvg(document)
}

/**
 * 在暂时去掉 `ROOT_ATTR` 的前提下读取 html/body 背景，避免被本扩展 `!important` 误判为已暗。
 */
function measureNativelyDarkSnapshot(autoDarkThreshold: number): boolean {
  const hadAttr = document.documentElement.hasAttribute(ROOT_ATTR)
  if (hadAttr) document.documentElement.removeAttribute(ROOT_ATTR)
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor
  const bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : ''
  if (hadAttr) document.documentElement.setAttribute(ROOT_ATTR, '')
  return isNativelyDarkFromHtmlBodyBackgrounds(htmlBg, bodyBg, autoDarkThreshold)
}

/**
 * 用 WASM 生成背景/前景色并注入样式。失败时静默降级，避免破坏页面。
 * RFC 006：Dynamic 下空闲时采样 → k=2 后取较暗质心（浅色顶栏+深色主区时更贴近主区）→ RFC 005 批混合；异常则 k=1 或静态色。
 * RFC 012：Static 下跳过采样，与 Dynamic 互斥。
 * RFC 013：Filter CSS 走反相路径。
 * RFC 014：Filter+ 走 SVG，失败则 013。
 * RFC 019：每站自定义 CSS 经 `ensureCustomCssStyleElement` 注入主文档；不穿透 Shadow DOM / 跨域 iframe。
 */
async function applyForcedDark(): Promise<void> {
  const applyDark = await readShouldApplyForcedDarkForPage()
  if (!applyDark) {
    document.documentElement.removeAttribute(ROOT_ATTR)
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
    ensureTypographyStyleElement('')
    ensureCustomCssStyleElement('')
    removeFilterPlusSvg(document)
    return
  }

  const policy = await readGlobalPolicy()
  const budget = await readSamplingBudget()
  const { themeMode, themeFilters } = await readEffectiveThemeForPage()
  const pagePalette = await readEffectivePagePaletteForPage()
  const typoSettings = await readEffectiveTypographyForPage()
  const siteCustomCss = await readSiteCustomCssForPage()
  const autoDarkThreshold = await readAutoDarkThreshold()

  const runPaint = (): void => {
    try {
      stopRecolorDynamicObserver()
      restoreBackgroundImageFiltersInDocument(document)
      // 重绘前先还原上一轮 Dynamic 内联改色，避免二次 modifyColor 漂移。
      restoreInlineStylesInDocument(document)

      // Read html/body computed background BEFORE mode-specific branches (RFC 025).
      // We cannot use k-means baseRgb for this check (many dark SPAs return transparent
      // backgrounds and trigger STATIC_FALLBACK_RGB = [248,250,252]).
      const nativelyDark = measureNativelyDarkSnapshot(autoDarkThreshold)

      if (policy === POLICY_AUTO && nativelyDark) {
        clearForcedDarkSurface()
        return
      }

      /** `on` + 原生暗：禁止反相（Filter / Filter+），Dynamic/Static 仍走下方分支。 */
      const skipInvertOnNativeDark = nativelyDark && policy === POLICY_ON

      if (themeMode !== THEME_MODE_FILTER_PLUS) {
        removeFilterPlusSvg(document)
      }
      if (themeMode === THEME_MODE_FILTER_PLUS) {
        if (skipInvertOnNativeDark) {
          clearForcedDarkSurface()
          return
        }
        paintFilterPlusPath(themeFilters, pagePalette)
        return
      }
      if (themeMode === THEME_MODE_FILTER_CSS) {
        if (skipInvertOnNativeDark) {
          clearForcedDarkSurface()
          return
        }
        paintFilterCssPath(themeFilters, pagePalette)
        return
      }
      if (themeMode === THEME_MODE_STATIC) {
        paintStaticPath(themeFilters, pagePalette)
        return
      }

      /** RFC 031 §3.1：Dynamic 主路径 = 逐规则改色；失败退采样单色。 */
      if (!wasmRecolorAvailable()) {
        paintSampledFallbackPath(themeFilters, pagePalette, budget)
        return
      }
      try {
        if (paintRecolorPath(themeFilters, pagePalette)) {
          startRecolorDynamicObserver(themeFilters, budget, pagePalette)
          scheduleBackgroundImageRecolor(budget)
        } else {
          paintSampledFallbackPath(themeFilters, pagePalette, budget)
        }
      } catch {
        paintSampledFallbackPath(themeFilters, pagePalette, budget)
      }
    } finally {
      ensureTypographyStyleElement(buildTypographyCss(typoSettings))
      ensureCustomCssStyleElement(siteCustomCss)
    }
  }

  scheduleIdleTask(() => {
    void (async () => {
      if (themeMode === THEME_MODE_DYNAMIC) {
        await whenDocumentComplete()
      } else {
        await whenDomReady()
      }
      runPaint()
    })()
  })
}

void applyForcedDark()

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  const touched = STORAGE_KEYS_AFFECTING_INJECTION.some((k) => changes[k] !== undefined)
  if (touched) void applyForcedDark()
})
