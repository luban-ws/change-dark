import { mix_toward_black, suggested_foreground_for_dark_bg } from '@luban-ws/dark-engine'

import { buildDarkCss, ensureStyleElement } from '../shared/css'
import { ROOT_ATTR, STORAGE_KEY_ENABLED, STYLE_ELEMENT_ID } from '../shared/constants'
import { readEnabled } from '../shared/storage'

/**
 * 将 RGB 分量格式化为 CSS rgb()，避免魔法字符串散落。
 */
function rgb(parts: Uint8Array | number[]): string {
  const [r, g, b] = parts
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 用 WASM 生成背景/前景色并注入样式。失败时静默降级，避免破坏页面。
 */
async function applyForcedDark(): Promise<void> {
  const enabled = await readEnabled()
  if (!enabled) {
    document.documentElement.removeAttribute(ROOT_ATTR)
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
    return
  }

  // bundler 目标下 `dark_engine.js` 在加载时完成 `__wbindgen_start`；这里直接调用导出函数即可。
  // 以近似白底的“纸面”为基准向黑色混合，得到柔和暗底；大量运算可走 WASM 批量 API 扩展。
  const baseR = 248
  const baseG = 250
  const baseB = 252
  const bgParts = mix_toward_black(baseR, baseG, baseB, 0.88)
  const fgParts = suggested_foreground_for_dark_bg(bgParts[0]!, bgParts[1]!, bgParts[2]!)

  const css = buildDarkCss(rgb(bgParts), rgb(fgParts))
  document.documentElement.setAttribute(ROOT_ATTR, '')
  ensureStyleElement(css)
}

void applyForcedDark()

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes[STORAGE_KEY_ENABLED]) void applyForcedDark()
})
