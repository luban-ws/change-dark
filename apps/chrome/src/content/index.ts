import {
  batch_mix_toward_black,
  mix_toward_black,
  suggested_foreground_for_dark_bg,
} from '@change-dark/dark-engine'

import {
  scheduleIdleTask,
  whenDocumentComplete,
} from './sampling'
import { paintRecolorInlinePath, paintRecolorPath, paintRecolorStylesheetPath } from './recolor-path'
import { resolveDynamicBaseRgbWithBranch } from './dynamic-fallback'
import {
  startRecolorDynamicObserver,
  stopRecolorDynamicObserver,
  updateRecolorObserverPaintState,
} from './recolor-observer'
import { scheduleBackgroundImageRecolor } from './recolor-background-images'
import {
  attachLightSurfaceResweepListeners,
  scheduleDocumentLightSurfaceResweep,
  sweepDocumentLightSurfaces,
} from './document-light-surface-sweep'
import { sweepFixedChromeSurfaces } from './fixed-chrome-sweep'
import { applyPageSurfaceFloor, clearPageSurfaceFloor } from './page-surface-floor'
import { refreshActiveSitePolicy, getActiveSitePolicy } from './site-policy'
import {
  sweepVisibleHeuristicSurfaces,
  sweepVisibleLandmarkSurfaces,
} from './visible-light-surface-sweep'
import type { SamplingBudget, PagePalette, ThemeFiltersStateV1 } from '@change-dark/extension-settings'
import {
  MIX_TOWARD_BLACK_AMOUNT,
  ROOT_ATTR,
  STORAGE_KEYS_AFFECTING_INJECTION,
  STYLE_ELEMENT_ID,
  POLICY_AUTO,
  buildTypographyCss,
  isNativelyDarkFromHtmlBodyBackgrounds,
  readEffectivePagePaletteForPage,
  readEffectiveThemeForPage,
  readEffectiveTypographyForPage,
  readSamplingBudget,
  readShouldApplyForcedDarkForPage,
  readSiteCustomCssForPage,
  readGlobalPolicy,
  readAutoDarkThreshold,
  sanitizeSiteCustomCss,
  resolvePageColorsForPalette,
} from '@change-dark/extension-settings'
import {
  buildStaticDarkCss,
  ensureCustomCssStyleElement,
  ensureStyleElement,
  ensureTypographyStyleElement,
} from '@change-dark/injected-styles'
import {
  collectReadableStylesheetCssTexts,
  mergeRecolorStyleText,
  resolveThemePalette,
  restoreBackgroundImageFiltersInDocument,
  restoreInlineStylesInDocument,
  type ResolvedThemePalette,
} from '@change-dark/dynamic-recolor'

/**
 * 内容脚本注入约定（RFC 031 Dynamic-only）：
 * - **原生暗页**：`auto` → 不注入；`on` → 仍注入 Dynamic。
 * - **页面调色板**：`readEffectivePagePaletteForPage()` 传入 Dynamic 主路径与采样回退。
 */

function rgb(parts: Uint8Array | number[]): string {
  const [r, g, b] = parts
  return `rgb(${r}, ${g}, ${b})`
}

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

/** Dynamic 采样铺底 CSS + 解析后的主题 preset（RFC 031 §5.1.1）。 */
function buildSampledPalette(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
  budget: SamplingBudget,
): { baseCss: string; theme: ResolvedThemePalette } {
  const { rgb: baseRgb } = resolveDynamicBaseRgbWithBranch(budget)
  const { pageBg, pageFg } = resolvePageColorsForPalette(
    pagePalette,
    mixBackgroundAndForegroundFromBase(baseRgb),
  )
  return {
    baseCss: buildStaticDarkCss(pageBg, pageFg, themeFilters),
    theme: resolveThemePalette(pagePalette, pageBg, pageFg),
  }
}

/** 合并 RFC 034 catalog 与用户 RFC 019 自定义 CSS。 */
function mergeEffectiveCustomCss(userCss: string): string {
  const catalogCss = getActiveSitePolicy().customCss.trim()
  return sanitizeSiteCustomCss([catalogCss, userCss.trim()].filter(Boolean).join('\n'))
}

/** 首屏同步：暗底 + 顶栏/地标铺底 + stylesheet 改色（含 Solarized preset）。 */
function applyFastDynamicPaintShell(
  themeFilters: ThemeFiltersStateV1,
  theme: ResolvedThemePalette,
  baseCss: string,
  budget: SamplingBudget,
): void {
  document.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(mergeRecolorStyleText(baseCss, ''))
  applyPageSurfaceFloor(document)
  paintRecolorStylesheetPath(themeFilters, theme, document, baseCss)
  sweepFixedChromeSurfaces(document, budget)
  sweepDocumentLightSurfaces(document, budget)
  scheduleDocumentLightSurfaceResweep(document, budget, 0)
}

/** idle 分片：WASM 改色 + 视口 sweep（重活不阻塞首帧）。 */
function applyHeavyDynamicPaintWork(
  themeFilters: ThemeFiltersStateV1,
  theme: ResolvedThemePalette,
  budget: SamplingBudget,
  baseCss: string,
): void {
  try {
    paintRecolorInlinePath(theme, document)
    lastReadableStylesheetCount = collectReadableStylesheetCssTexts(document).readableSheetCount
    startRecolorDynamicObserver(themeFilters, budget, theme, baseCss)
    scheduleBackgroundImageRecolor(budget)
    scheduleDynamicRecolorRetries(themeFilters, theme, budget, baseCss)
    sweepVisibleLandmarkSurfaces(document, budget)
    sweepDocumentLightSurfaces(document, budget)
    attachLightSurfaceResweepListeners(document, budget)
    scheduleDocumentLightSurfaceResweep(document, budget, 0)
    window.setTimeout(() => {
      if (!document.documentElement.hasAttribute(ROOT_ATTR)) return
      scheduleDocumentLightSurfaceResweep(document, budget, 0)
    }, 280)
    scheduleIdleTask(() => {
      sweepVisibleHeuristicSurfaces(document, budget)
    })
  } catch {
    startRecolorDynamicObserver(themeFilters, budget, theme, baseCss)
    scheduleBackgroundImageRecolor(budget)
    sweepVisibleLandmarkSurfaces(document, budget)
    sweepDocumentLightSurfaces(document, budget)
    attachLightSurfaceResweepListeners(document, budget)
  }
}

function clearForcedDarkSurface(): void {
  stopRecolorDynamicObserver()
  restoreBackgroundImageFiltersInDocument(document)
  restoreInlineStylesInDocument(document)
  clearPageSurfaceFloor(document)
  document.documentElement.removeAttribute(ROOT_ATTR)
  document.getElementById(STYLE_ELEMENT_ID)?.remove()
}

function measureNativelyDarkSnapshot(autoDarkThreshold: number): boolean {
  const hadAttr = document.documentElement.hasAttribute(ROOT_ATTR)
  if (hadAttr) document.documentElement.removeAttribute(ROOT_ATTR)
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor
  const bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : ''
  if (hadAttr) document.documentElement.setAttribute(ROOT_ATTR, '')
  return isNativelyDarkFromHtmlBodyBackgrounds(htmlBg, bodyBg, autoDarkThreshold)
}

const DYNAMIC_RECOLOR_RETRY_DELAYS_MS = [600, 2000] as const

let lastReadableStylesheetCount = 0

function scheduleDynamicRecolorRetries(
  themeFilters: ThemeFiltersStateV1,
  theme: ResolvedThemePalette,
  budget: SamplingBudget,
  baseCss: string,
): void {
  for (const delayMs of DYNAMIC_RECOLOR_RETRY_DELAYS_MS) {
    scheduleIdleTask(() => {
      window.setTimeout(() => {
        if (!document.documentElement.hasAttribute(ROOT_ATTR)) return
        const { readableSheetCount } = collectReadableStylesheetCssTexts(document)
        if (readableSheetCount <= lastReadableStylesheetCount) return
        lastReadableStylesheetCount = readableSheetCount

        try {
          if (paintRecolorPath(themeFilters, theme, document, baseCss)) {
            updateRecolorObserverPaintState(baseCss)
          }
          scheduleBackgroundImageRecolor(budget)
          scheduleDocumentLightSurfaceResweep(document, budget, 120)
        } catch {
          /* 保持已有铺底与覆盖层 */
        }
      }, delayMs)
    })
  }
}

async function applyForcedDark(): Promise<void> {
  const [
    applyDark,
    policy,
    budget,
    { themeFilters },
    pagePalette,
    typoSettings,
    siteCustomCss,
    autoDarkThreshold,
  ] = await Promise.all([
    readShouldApplyForcedDarkForPage(),
    readGlobalPolicy(),
    readSamplingBudget(),
    readEffectiveThemeForPage(),
    readEffectivePagePaletteForPage(),
    readEffectiveTypographyForPage(),
    readSiteCustomCssForPage(),
    readAutoDarkThreshold(),
  ])

  if (!applyDark) {
    document.documentElement.removeAttribute(ROOT_ATTR)
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
    ensureTypographyStyleElement('')
    ensureCustomCssStyleElement('')
    return
  }

  const runPaint = (): void => {
    try {
      stopRecolorDynamicObserver()
      restoreBackgroundImageFiltersInDocument(document)
      restoreInlineStylesInDocument(document)
      lastReadableStylesheetCount = 0

      const nativelyDark = measureNativelyDarkSnapshot(autoDarkThreshold)

      if (policy === POLICY_AUTO && nativelyDark) {
        clearForcedDarkSurface()
        return
      }

      const { baseCss, theme } = buildSampledPalette(themeFilters, pagePalette, budget)
      refreshActiveSitePolicy(document)
      applyFastDynamicPaintShell(themeFilters, theme, baseCss, budget)

      scheduleIdleTask(() => {
        applyHeavyDynamicPaintWork(themeFilters, theme, budget, baseCss)
      })
    } finally {
      ensureTypographyStyleElement(buildTypographyCss(typoSettings))
      ensureCustomCssStyleElement(mergeEffectiveCustomCss(siteCustomCss))
    }
  }

  scheduleIdleTask(() => {
    void (async () => {
      await whenDocumentComplete()
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
