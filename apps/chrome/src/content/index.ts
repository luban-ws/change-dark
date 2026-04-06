import {
  batch_mix_toward_black,
  kMeansDarkerCentroid,
  kMeansRgbCentroids,
  mix_toward_black,
  suggested_foreground_for_dark_bg,
} from '@luban-ws/dark-engine'

import {
  collectPageBackgroundRgbBuffer,
  scheduleIdleTask,
  whenDocumentComplete,
  whenDomReady,
} from './sampling'
import {
  buildFilterInvertCss,
  buildStaticDarkCss,
  ensureCustomCssStyleElement,
  ensureStyleElement,
  ensureTypographyStyleElement,
} from "@luban-ws/shared"
import {
  buildFilterPlusCss,
  ensureFilterPlusSvg,
  removeFilterPlusSvg,
  shouldExposeFilterPlusMode,
} from "@luban-ws/shared"
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
} from "@luban-ws/shared"
import {
  PAGE_PALETTE_SOLARIZED_DARK,
  SOLARIZED_PAGE_BG_CSS,
  SOLARIZED_PAGE_FG_CSS,
  type PagePalette,
} from "@luban-ws/shared"
import { buildTypographyCss } from "@luban-ws/shared"
import {
  readEffectivePagePaletteForPage,
  readEffectiveThemeForPage,
  readEffectiveTypographyForPage,
  readSamplingBudget,
  readShouldApplyForcedDarkForPage,
  readSiteCustomCssForPage,
  readGlobalPolicy,
} from "@luban-ws/shared"
import type { ThemeFiltersStateV1 } from "@luban-ws/shared"

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

/**
 * RFC 013：无 WASM / 无采样；整页 CSS 反相 + 媒体再反相，可与 RFC 011 链式组合。
 */
function paintFilterCssPath(themeFilters: ThemeFiltersStateV1): void {
  const css = buildFilterInvertCss(themeFilters)
  document.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(css)
}

/**
 * RFC 014：SVG `filter` + 失败或非 Chromium 时降级为 RFC 013。
 */
function paintFilterPlusPath(themeFilters: ThemeFiltersStateV1): void {
  if (!shouldExposeFilterPlusMode()) {
    paintFilterCssPath(themeFilters)
    return
  }
  try {
    if (!ensureFilterPlusSvg(document)) {
      paintFilterCssPath(themeFilters)
      return
    }
    const css = buildFilterPlusCss(themeFilters)
    document.documentElement.setAttribute(ROOT_ATTR, '')
    ensureStyleElement(css)
  } catch {
    paintFilterCssPath(themeFilters)
  }
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

  const runPaint = (): void => {
    try {
      if (themeMode !== THEME_MODE_FILTER_PLUS) {
        removeFilterPlusSvg(document)
      }
      if (themeMode === THEME_MODE_FILTER_PLUS) {
        paintFilterPlusPath(themeFilters)
        return
      }
      if (themeMode === THEME_MODE_FILTER_CSS) {
        paintFilterCssPath(themeFilters)
        return
      }
      if (themeMode === THEME_MODE_STATIC) {
        paintStaticPath(themeFilters, pagePalette)
        return
      }

      let baseRgb: Uint8Array
      try {
        const buffer = collectPageBackgroundRgbBuffer(budget, () => Date.now())
        // 至少 2 个像素（6 字节）才做双簇；过少则与 Static 一致回退（RFC 006 / 012）。
        if (buffer.length < 6) {
          baseRgb = new Uint8Array(STATIC_FALLBACK_RGB)
        } else {
          try {
            baseRgb = new Uint8Array(kMeansDarkerCentroid(buffer, 40))
          } catch {
            try {
              baseRgb = kMeansRgbCentroids(buffer, 1, 40).subarray(0, 3)
            } catch {
              baseRgb = new Uint8Array(STATIC_FALLBACK_RGB)
            }
          }
        }
      } catch {
        baseRgb = new Uint8Array(STATIC_FALLBACK_RGB)
      }

      // AUTO mode: if site is already natively dark, skip dark injection
      // Luminance: 0.2126*R + 0.7152*G + 0.0722*B  (0=black, 255=white)
      if (policy === POLICY_AUTO) {
        const luma = 0.2126 * baseRgb[0]! + 0.7152 * baseRgb[1]! + 0.0722 * baseRgb[2]!
        if (luma < 80) {
          // Page is already dark — remove any injected styles and bail
          document.documentElement.removeAttribute(ROOT_ATTR)
          document.getElementById(STYLE_ELEMENT_ID)?.remove()
          return
        }
      }

      const { pageBg, pageFg } = colorsForPalette(pagePalette, baseRgb)
      const css = buildStaticDarkCss(pageBg, pageFg, themeFilters)
      document.documentElement.setAttribute(ROOT_ATTR, '')
      ensureStyleElement(css)
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
