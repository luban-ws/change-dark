/**
 * 与 RFC 025 / 内容脚本 `applyForcedDark` 一致：用 html/body 的 computed background 判断「原生已暗」，
 * 供 AUTO 全模式跳过与 Filter/Filter+ 单独跳过（避免反相把暗页变亮）。
 */

/** 匹配 `rgb(...)` / `rgba(..., a)` 前三通道（与内容脚本历史实现一致）。 */
const RGB_PREFIX_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/

/** 从 `rgba(..., alpha)` 捕获 alpha；无则视为不透明。 */
const RGBA_ALPHA_RE = /rgba\([^)]+,\s*([\d.]+)\)/

/** 近全透明背景视为「无实色」，不参与已暗判定（与 RFC 025 一致）。 */
const NEAR_TRANSPARENT_ALPHA = 0.05

/**
 * 从 `getComputedStyle(...).backgroundColor` 常见返回值解析相对亮度（sRGB 近似 luma）。
 * `transparent` / 无法解析 → `null`；`rgba` 且 alpha &lt; 0.05 → `null`。
 */
export function parseComputedBackgroundLuma(css: string): number | null {
  const m = css.match(RGB_PREFIX_RE)
  if (!m) return null
  const alphaM = css.match(RGBA_ALPHA_RE)
  if (alphaM && parseFloat(alphaM[1]) < NEAR_TRANSPARENT_ALPHA) return null
  const r = +m[1]!
  const g = +m[2]!
  const b = +m[3]!
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * `html` 或 `body` 任一边界面色低于阈值则视为原生已暗。
 */
export function isNativelyDarkFromHtmlBodyBackgrounds(
  htmlBackgroundColor: string,
  bodyBackgroundColor: string,
  autoDarkThreshold: number,
): boolean {
  const htmlLuma = parseComputedBackgroundLuma(htmlBackgroundColor)
  const bodyLuma = parseComputedBackgroundLuma(bodyBackgroundColor)
  return (
    (htmlLuma !== null && htmlLuma < autoDarkThreshold) ||
    (bodyLuma !== null && bodyLuma < autoDarkThreshold)
  )
}
