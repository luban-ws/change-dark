import {
  batch_mix_toward_black,
  kMeansRgbCentroids,
  mix_toward_black,
  suggested_foreground_for_dark_bg,
} from '@luban-ws/dark-engine'

import { collectPageBackgroundRgbBuffer, scheduleIdleTask, whenDomReady } from './sampling'
import { buildDarkCss, ensureStyleElement } from '../shared/css'
import {
  MIX_TOWARD_BLACK_AMOUNT,
  ROOT_ATTR,
  STATIC_FALLBACK_RGB,
  STORAGE_KEYS_AFFECTING_INJECTION,
  STYLE_ELEMENT_ID,
} from '../shared/constants'
import {
  readSamplingBudget,
  readShouldApplyForcedDarkForPage,
  readThemeFiltersState,
} from '../shared/storage'

/**
 * 将 RGB 分量格式化为 CSS rgb()，避免魔法字符串散落。
 */
function rgb(parts: Uint8Array | number[]): string {
  const [r, g, b] = parts
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 用 WASM 生成背景/前景色并注入样式。失败时静默降级，避免破坏页面。
 * RFC 006：空闲时采样 → k-means 代表色 → RFC 005 批混合；异常则回退静态色。
 */
async function applyForcedDark(): Promise<void> {
  const applyDark = await readShouldApplyForcedDarkForPage()
  if (!applyDark) {
    document.documentElement.removeAttribute(ROOT_ATTR)
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
    return
  }

  const budget = await readSamplingBudget()
  const themeFilters = await readThemeFiltersState()

  const runPaint = (): void => {
    let baseRgb: Uint8Array
    try {
      const buffer = collectPageBackgroundRgbBuffer(budget, () => Date.now())
      if (buffer.length < 3) {
        baseRgb = new Uint8Array(STATIC_FALLBACK_RGB)
      } else {
        baseRgb = kMeansRgbCentroids(buffer, 1, 40).subarray(0, 3)
      }
    } catch {
      baseRgb = new Uint8Array(STATIC_FALLBACK_RGB)
    }

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

    const css = buildDarkCss(rgb(bgParts), rgb(fgParts), themeFilters)
    document.documentElement.setAttribute(ROOT_ATTR, '')
    ensureStyleElement(css)
  }

  scheduleIdleTask(() => {
    void whenDomReady().then(runPaint)
  })
}

void applyForcedDark()

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  const touched = STORAGE_KEYS_AFFECTING_INJECTION.some((k) => changes[k] !== undefined)
  if (touched) void applyForcedDark()
})
