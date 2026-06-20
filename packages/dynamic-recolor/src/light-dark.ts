/**
 * `light-dark()` 与 `color-scheme: dark` 交互：作者变量在暗色 scheme 下会走暗色分支，
 * 若扩展未改写 `--*` 定义，表面会落成站点自有的近黑而非 preset（如 Solarized base03）。
 */

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
} from '@change-dark/extension-settings'
import { parseCssColorToken } from './color-parse'
import {
  isNeutralPaletteCandidate,
  relativeRgbLuma,
} from './palette-apply'

export const LIGHT_DARK_FUNCTION_PREFIX = /^light-dark\s*\(/i

/** 解析 `light-dark(a, b)` 的两个分支（尊重括号嵌套）。 */
export function parseLightDarkBranches(
  value: string,
): { light: string; dark: string } | null {
  const s = value.trim()
  if (!LIGHT_DARK_FUNCTION_PREFIX.test(s)) return null
  const openIdx = s.indexOf('(')
  if (openIdx < 0) return null

  let depth = 0
  let commaIdx = -1
  for (let i = openIdx; i < s.length; i += 1) {
    const c = s[i]!
    if (c === '(') depth += 1
    else if (c === ')') {
      depth -= 1
      if (depth === 0) {
        if (commaIdx < 0) return null
        return {
          light: s.slice(openIdx + 1, commaIdx).trim(),
          dark: s.slice(commaIdx + 1, i).trim(),
        }
      }
    } else if (c === ',' && depth === 1 && commaIdx < 0) {
      commaIdx = i
    }
  }
  return null
}

export type LightDarkNeutralRole = 'surface' | 'text' | 'line'

/** 解析中性灰 oklch 的 L 通道（0..1），用于 light-dark 暗色分支。 */
export function parseOklchNeutralLightness(value: string): number | null {
  const m =
    /^oklch\s*\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)\s*\)/i.exec(
      value.trim(),
    )
  if (!m) return null
  const parsePercent = (raw: string): number => {
    const n = parseFloat(raw)
    if (!Number.isFinite(n)) return NaN
    return raw.includes('%') ? n / 100 : n > 1 ? n / 100 : n
  }
  const l = parsePercent(m[1]!)
  const c = parsePercent(m[2]!)
  if (!Number.isFinite(l) || !Number.isFinite(c)) return null
  if (c > 0.05) return null
  return Math.min(1, Math.max(0, l))
}

function branchNeutralLuma(value: string): number | null {
  const rgb = parseCssColorToken(value)
  if (rgb) {
    if (!isNeutralPaletteCandidate(rgb)) return null
    return relativeRgbLuma(rgb)
  }
  return parseOklchNeutralLightness(value)
}

function isNeutralLightDarkBranch(value: string): boolean {
  return branchNeutralLuma(value) != null
}

/**
 * 识别「浅/深中性表面」或「深/浅正文」型 light-dark token（Cloudflare kumo、Tailwind v4 等）。
 */
export function classifyLightDarkNeutralRole(
  light: string,
  dark: string,
): LightDarkNeutralRole | null {
  if (!isNeutralLightDarkBranch(light) || !isNeutralLightDarkBranch(dark)) {
    return null
  }
  const lightL = branchNeutralLuma(light)!
  const darkL = branchNeutralLuma(dark)!
  if (lightL > 0.55 && darkL < 0.35) return 'surface'
  if (lightL > 0.55 && darkL >= 0.15 && darkL <= 0.48) return 'line'
  if (lightL < 0.42 && darkL > 0.55) return 'text'
  return null
}

/** 将中性 light-dark 表面/正文/分隔线 token 绑到当前 preset 的 page 变量。 */
export function recolorLightDarkToPaletteVar(value: string): string | null {
  const branches = parseLightDarkBranches(value)
  if (!branches) return null
  const role = classifyLightDarkNeutralRole(branches.light, branches.dark)
  if (role === 'surface') return `var(${CSS_VAR_PAGE_BG})`
  if (role === 'line') return `var(${CSS_VAR_PAGE_BORDER})`
  if (role === 'text') return `var(${CSS_VAR_PAGE_FG})`
  return null
}
