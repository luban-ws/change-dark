/**
 * RFC 031 P1-6：Dynamic 逐规则改色 Phase 1 已知限制（与 DR #2583 同档）。
 *
 * 静态 stylesheet 重写读**声明原文**，无法解析/改写的 token 跳过并保留站点原色。
 */

/** 跳过原因 ID（测试与日志用）。 */
export const RECOLOR_SKIP_REASON = {
  CSS_VAR: 'css-var',
  HWB: 'hwb',
  CURRENT_COLOR: 'currentcolor',
  UNPARSEABLE: 'unparseable',
} as const

export type RecolorSkipReason =
  (typeof RECOLOR_SKIP_REASON)[keyof typeof RECOLOR_SKIP_REASON]

/** 单条已知限制（用户可见说明 + 技术原因）。 */
export interface RecolorKnownLimitation {
  id: RecolorSkipReason | 'cross-origin-stylesheet' | 'shadow-dom' | 'cross-origin-iframe'
  title: string
  description: string
  /** DR 同类限制参考 */
  reference?: string
}

/** RFC 031 P1-6 完整已知限制表（文档真源）。 */
export const RECOLOR_KNOWN_LIMITATIONS: readonly RecolorKnownLimitation[] = [
  {
    id: RECOLOR_SKIP_REASON.CSS_VAR,
    title: 'CSS 自定义属性 `var(--*)`',
    description:
      '静态重写仅见 `color: var(--x)` 字面量，无法在不知道 `--x` 定义的情况下改写。元素仍显示变量解析后的原站色。',
    reference: 'https://github.com/darkreader/darkreader/issues/2583',
  },
  {
    id: RECOLOR_SKIP_REASON.HWB,
    title: 'HWB 颜色语法',
    description: 'Phase 1 Rust 解析器暂不支持 `hwb()`；`#hex` / `rgb()` / `hsl()` / 基础命名色已支持。',
  },
  {
    id: 'cross-origin-stylesheet',
    title: '跨域 stylesheet',
    description:
      '浏览器对跨域 `<link rel="stylesheet">` 抛 SecurityError，该表规则无法读取；对应元素保持原色（整页不回退）。',
  },
  {
    id: 'shadow-dom',
    title: 'Shadow DOM',
    description: 'Phase 1 不穿透 shadowRoot / adoptedStyleSheets。',
  },
  {
    id: 'cross-origin-iframe',
    title: '跨域 iframe',
    description: '与 RFC 013 一致：无法向跨域子文档注入改色样式。',
  },
] as const

const CSS_VAR_PREFIX = /^var\s*\(/i
const HWB_PREFIX = /^hwb\s*\(/i

/** 若值因 Phase 1 限制不可改色，返回跳过原因；否则 null（交 Rust/WASM 解析）。 */
export function getRecolorSkipReason(value: string): RecolorSkipReason | null {
  const s = value.trim()
  if (s === '' || s === 'transparent') return RECOLOR_SKIP_REASON.UNPARSEABLE
  if (CSS_VAR_PREFIX.test(s)) return RECOLOR_SKIP_REASON.CSS_VAR
  if (HWB_PREFIX.test(s)) return RECOLOR_SKIP_REASON.HWB
  if (s.toLowerCase() === 'currentcolor') return RECOLOR_SKIP_REASON.CURRENT_COLOR
  return null
}

/** `var(--x)` 等是否属于 P1-6 已知不可改色 token。 */
export function isRecolorUnsupportedColorValue(value: string): boolean {
  return getRecolorSkipReason(value) != null
}
