import {
  batch_mix_toward_black,
  mix_toward_black,
  suggested_foreground_for_dark_bg,
} from '@luban-ws/dark-engine'

import {
  scheduleIdleTask,
  whenDocumentComplete,
} from './sampling'
import { paintRecolorPath } from './recolor-path'
import { resolveDynamicBaseRgbWithBranch } from './dynamic-fallback'
import {
  startRecolorDynamicObserver,
  stopRecolorDynamicObserver,
} from './recolor-observer'
import { scheduleBackgroundImageRecolor } from './recolor-background-images'
import type { SamplingBudget, PagePalette, ThemeFiltersStateV1 } from '@luban-ws/extension-settings'
import {
  MIX_TOWARD_BLACK_AMOUNT,
  ROOT_ATTR,
  STORAGE_KEYS_AFFECTING_INJECTION,
  STYLE_ELEMENT_ID,
  POLICY_AUTO,
  PAGE_PALETTE_SOLARIZED_DARK,
  SOLARIZED_PAGE_BG_CSS,
  SOLARIZED_PAGE_FG_CSS,
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
} from '@luban-ws/extension-settings'
import {
  buildStaticDarkCss,
  ensureCustomCssStyleElement,
  ensureStyleElement,
  ensureTypographyStyleElement,
} from '@luban-ws/injected-styles'
import {
  hasReadableStylesheetCss,
  restoreBackgroundImageFiltersInDocument,
  restoreInlineStylesInDocument,
} from '@luban-ws/dynamic-recolor'

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

function colorsForPalette(
  palette: PagePalette,
  baseRgb: Uint8Array,
): { pageBg: string; pageFg: string } {
  if (palette === PAGE_PALETTE_SOLARIZED_DARK) {
    return { pageBg: SOLARIZED_PAGE_BG_CSS, pageFg: SOLARIZED_PAGE_FG_CSS }
  }
  return mixBackgroundAndForegroundFromBase(baseRgb)
}

/** Dynamic 采样铺底 CSS（RFC 032：首屏暗底，非独立「Static 模式」）。 */
function buildSampledBaseCss(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
  budget: SamplingBudget,
): string {
  const { rgb: baseRgb } = resolveDynamicBaseRgbWithBranch(budget)
  const { pageBg, pageFg } = colorsForPalette(pagePalette, baseRgb)
  return buildStaticDarkCss(pageBg, pageFg, themeFilters)
}

function clearForcedDarkSurface(): void {
  stopRecolorDynamicObserver()
  restoreBackgroundImageFiltersInDocument(document)
  restoreInlineStylesInDocument(document)
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

const DYNAMIC_RECOLOR_UPGRADE_DELAY_MS = 400

function scheduleDynamicRecolorUpgrade(
  themeFilters: ThemeFiltersStateV1,
  pagePalette: PagePalette,
  budget: SamplingBudget,
): void {
  scheduleIdleTask(() => {
    window.setTimeout(() => {
      if (!hasReadableStylesheetCss(document)) return
      try {
        const baseCss = buildSampledBaseCss(themeFilters, pagePalette, budget)
        if (paintRecolorPath(themeFilters, pagePalette, document, baseCss)) {
          scheduleBackgroundImageRecolor(budget)
        }
      } catch {
        /* 保持铺底层；MO 仍会处理后续 mutation */
      }
    }, DYNAMIC_RECOLOR_UPGRADE_DELAY_MS)
  })
}

async function applyForcedDark(): Promise<void> {
  const applyDark = await readShouldApplyForcedDarkForPage()
  if (!applyDark) {
    document.documentElement.removeAttribute(ROOT_ATTR)
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
    ensureTypographyStyleElement('')
    ensureCustomCssStyleElement('')
    return
  }

  const policy = await readGlobalPolicy()
  const budget = await readSamplingBudget()
  const { themeFilters } = await readEffectiveThemeForPage()
  const pagePalette = await readEffectivePagePaletteForPage()
  const typoSettings = await readEffectiveTypographyForPage()
  const siteCustomCss = await readSiteCustomCssForPage()
  const autoDarkThreshold = await readAutoDarkThreshold()

  const runPaint = (): void => {
    try {
      stopRecolorDynamicObserver()
      restoreBackgroundImageFiltersInDocument(document)
      restoreInlineStylesInDocument(document)

      const nativelyDark = measureNativelyDarkSnapshot(autoDarkThreshold)

      if (policy === POLICY_AUTO && nativelyDark) {
        clearForcedDarkSurface()
        return
      }

      const baseCss = buildSampledBaseCss(themeFilters, pagePalette, budget)
      document.documentElement.setAttribute(ROOT_ATTR, '')
      ensureStyleElement(baseCss)

      try {
        paintRecolorPath(themeFilters, pagePalette, document, baseCss)
        startRecolorDynamicObserver(themeFilters, budget, pagePalette, baseCss)
        scheduleBackgroundImageRecolor(budget)
        scheduleDynamicRecolorUpgrade(themeFilters, pagePalette, budget)
      } catch {
        ensureStyleElement(baseCss)
        startRecolorDynamicObserver(themeFilters, budget, pagePalette, baseCss)
        scheduleBackgroundImageRecolor(budget)
      }
    } finally {
      ensureTypographyStyleElement(buildTypographyCss(typoSettings))
      ensureCustomCssStyleElement(siteCustomCss)
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
