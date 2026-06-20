/**
 * RFC 031 §3.3 / S2：CSS 文本 → 解析规则 → 改色 → 覆盖 stylesheet（只读原文，不原地改 cssRules）。
 *
 * §5.3：整表改色走 `batchModifyColors` 单次 WASM，禁逐色过桥。
 */

import { ROOT_ATTR } from '@change-dark/extension-settings'
import { formatRgbHex, parseCssColorToken } from './color-parse'
import { recolorBackgroundImageDeclaration } from './background-image-css'
import { recolorBorderShorthandDeclaration } from './border-css'
import { recolorBoxShadowDeclaration } from './box-shadow-css'
import {
  colorUseForCssProperty,
} from './modify-css'
import {
  DEFAULT_DARK_PROFILE,
  batchModifyColors,
  type ColorProfile,
  type ColorUse,
  type Rgb,
} from './modify-colors'
import { recolorLightDarkToPaletteVar } from './light-dark'
import { resolveThemedRecolorCssValue } from './palette-apply'

/** 单条可注入的覆盖规则（含 @media / @keyframes 外层包裹）。 */
export interface RecolorOverrideRule {
  /** 自外向内：如 `@media (min-width: 600px)` */
  wrappers: readonly string[]
  /** 规则选择器：`.foo` 或 keyframe 的 `0%` */
  selector: string
  /** 已改色且带 `!important` 的声明块 */
  declarations: string
}

/** 解析阶段规则草稿（尚未改色）。 */
interface RecolorRuleDraft {
  wrappers: readonly string[]
  selector: string
  body: string
}

/** 单条声明改色计划。 */
interface DeclarationRecolorPlan {
  prop: string
  batch?: { rgb: Rgb; use: ColorUse }
  /** 渐变等不走 modifyColor 批次的已算好字面量 */
  literal?: string
}

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g

/** 去掉注释，便于纯文本解析。 */
export function stripCssComments(css: string): string {
  return css.replace(BLOCK_COMMENT, '')
}

/** 按 `;` 切声明，尊重 `rgb()` / `rgba()` 括号深度。 */
export function splitCssDeclarations(block: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of block) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ';' && depth === 0) {
      if (cur.trim()) parts.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function stripImportant(value: string): string {
  return value.trim().replace(/\s*!important\s*$/i, '').trim()
}

function planDeclarationRecolor(property: string, rawValue: string): DeclarationRecolorPlan | null {
  const prop = property.trim()
  const val = stripImportant(rawValue)
  const lightDarkLiteral = recolorLightDarkToPaletteVar(val)
  if (lightDarkLiteral) {
    return { prop, literal: lightDarkLiteral }
  }
  const use = colorUseForCssProperty(prop)
  if (use) {
    const rgb = parseCssColorToken(val)
    if (!rgb) return null
    return { prop, batch: { rgb, use } }
  }
  const bgLiteral = recolorBackgroundImageDeclaration(prop, val)
  if (bgLiteral) return { prop, literal: bgLiteral }
  const borderLiteral = recolorBorderShorthandDeclaration(prop, val)
  if (borderLiteral) return { prop, literal: borderLiteral }
  const shadowLiteral = recolorBoxShadowDeclaration(prop, val)
  if (shadowLiteral) return { prop, literal: shadowLiteral }
  return null
}

function formatRecoloredDeclaration(prop: string, value: string): string {
  return `${prop}: ${value} !important`
}

function formatBatchRecolorValue(
  original: { rgb: Rgb; use: ColorUse },
  wasmRgb: Rgb,
): string {
  return resolveThemedRecolorCssValue(original.rgb, original.use, wasmRgb, formatRgbHex)
}

function recolorDeclarationPlans(
  plans: readonly DeclarationRecolorPlan[],
  profile: ColorProfile,
): string {
  const batchJobs = plans
    .map((p) => p.batch)
    .filter((b): b is { rgb: Rgb; use: ColorUse } => b != null)
  const batchResults = batchModifyColors(batchJobs, profile)
  let batchCursor = 0
  return plans
    .map((plan) => {
      if (plan.literal != null) {
        return formatRecoloredDeclaration(plan.prop, plan.literal)
      }
      const batch = plan.batch!
      const out = batchResults[batchCursor]!
      batchCursor += 1
      return formatRecoloredDeclaration(
        plan.prop,
        formatBatchRecolorValue(batch, out),
      )
    })
    .join('; ')
}

/**
 * 改写声明块内可识别的颜色 longhand；输出仅含成功改色的 `prop: val !important`。
 * 块内颜色走单次 WASM 批变换。
 */
export function recolorDeclarationBlock(
  block: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string {
  const plans = splitCssDeclarations(block)
    .map((decl) => {
      const colon = decl.indexOf(':')
      if (colon < 0) return null
      return planDeclarationRecolor(
        decl.slice(0, colon),
        decl.slice(colon + 1),
      )
    })
    .filter((p): p is DeclarationRecolorPlan => p != null)
  if (plans.length === 0) return ''
  return recolorDeclarationPlans(plans, profile)
}

/** 为覆盖规则加 `html[ROOT_ATTR]` 前缀；@keyframes 步骤选择器保持不变。
 *  见 CLAUDE.md — `:root` 即 <html>，禁止 `html[x] :root` 后代写法。 */
function prefixSelectorPart(part: string): string {
  const p = part.trim()
  if (!p) return `html[${ROOT_ATTR}]`
  // :root / :host 即 <html>，后代组合子 `html[x] :root` 永不匹配。
  if (p === ':root' || p === ':host') return `html[${ROOT_ATTR}]`
  if (p.startsWith('[')) return `html[${ROOT_ATTR}]${p}`
  if (p.startsWith(':root')) {
    const suffix = p.slice(':root'.length).trim()
    if (!suffix) return `html[${ROOT_ATTR}]`
    if (suffix.startsWith('.') || suffix.startsWith('[')) {
      return `html[${ROOT_ATTR}]${suffix}`
    }
  }
  if (p.startsWith(':host')) {
    const suffix = p.slice(':host'.length).trim()
    if (!suffix) return `html[${ROOT_ATTR}]`
    if (suffix.startsWith('.') || suffix.startsWith('[')) {
      return `html[${ROOT_ATTR}]${suffix}`
    }
  }
  return `html[${ROOT_ATTR}] ${p}`
}

export function prefixRecolorOverrideSelector(selector: string): string {
  const trimmed = selector.trim()
  if (/^(?:from|to|\d+(?:\.\d+)?%)$/i.test(trimmed)) return trimmed
  if (trimmed.startsWith(`html[${ROOT_ATTR}]`)) return trimmed
  const parts = trimmed.split(',').map((part) => prefixSelectorPart(part))
  return [...new Set(parts)].join(', ')
}

/** 格式化单条覆盖规则（恢复 @media / @keyframes 嵌套）。 */
export function formatRecolorOverrideRule(rule: RecolorOverrideRule): string {
  const inner = `${prefixRecolorOverrideSelector(rule.selector)} { ${rule.declarations} }`
  return rule.wrappers.reduceRight((body, wrap) => `${wrap} { ${body} }`, inner)
}

/**
 * S2：整张 stylesheet 文本 → 覆盖 CSS 文本（golden in→out 快照用）。
 * 无改色声明的规则省略；无法解析的 @-rule 跳过。
 */
export function buildRecolorOverrideStylesheet(
  cssText: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): string {
  const rules = collectRecolorOverrideRules(cssText, profile)
  return rules.map(formatRecolorOverrideRule).join('\n\n')
}

/** 解析并收集所有需注入的改色规则。 */
export function collectRecolorOverrideRules(
  cssText: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
): RecolorOverrideRule[] {
  const drafts = collectRecolorRuleDrafts(cssText)
  return buildRulesFromDrafts(drafts, profile)
}

function buildRulesFromDrafts(
  drafts: readonly RecolorRuleDraft[],
  profile: ColorProfile,
): RecolorOverrideRule[] {
  const perDraftPlans: DeclarationRecolorPlan[][] = []
  const batchJobs: Array<{ rgb: Rgb; use: ColorUse }> = []

  for (const draft of drafts) {
    const plans: DeclarationRecolorPlan[] = []
    for (const decl of splitCssDeclarations(draft.body)) {
      const colon = decl.indexOf(':')
      if (colon < 0) continue
      const plan = planDeclarationRecolor(
        decl.slice(0, colon),
        decl.slice(colon + 1),
      )
      if (!plan) continue
      if (plan.batch) {
        batchJobs.push(plan.batch)
        plans.push({ prop: plan.prop, batch: plan.batch })
      } else if (plan.literal != null) {
        plans.push({ prop: plan.prop, literal: plan.literal })
      }
    }
    perDraftPlans.push(plans)
  }

  const batchResults = batchModifyColors(batchJobs, profile)
  let batchCursor = 0
  const rules: RecolorOverrideRule[] = []

  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i]!
    const plans = perDraftPlans[i]!
    if (plans.length === 0) continue

    const declarations = plans
      .map((plan) => {
        if (plan.literal != null) {
          return formatRecoloredDeclaration(plan.prop, plan.literal)
        }
        const batch = plan.batch!
        const out = batchResults[batchCursor]!
        batchCursor += 1
        return formatRecoloredDeclaration(
          plan.prop,
          formatBatchRecolorValue(batch, out),
        )
      })
      .join('; ')

    rules.push({
      wrappers: draft.wrappers,
      selector: draft.selector,
      declarations,
    })
  }

  return rules
}

function collectRecolorRuleDrafts(cssText: string): RecolorRuleDraft[] {
  const src = stripCssComments(cssText).trim()
  if (!src) return []
  return parseRuleDraftList(src, [])
}

function parseRuleDraftList(
  text: string,
  wrappers: readonly string[],
): RecolorRuleDraft[] {
  const out: RecolorRuleDraft[] = []
  let i = 0
  const len = text.length

  const skipWs = (): void => {
    while (i < len && /\s/.test(text[i]!)) i += 1
  }

  while (i < len) {
    skipWs()
    if (i >= len) break

    if (text[i] === '@') {
      const atRules = parseAtRule(text, i)
      i = atRules.end
      if (atRules.kind === 'group' && atRules.body != null && atRules.prelude != null) {
        out.push(...parseRuleDraftList(atRules.body, [...wrappers, `${atRules.prelude}`]))
      } else if (atRules.kind === 'keyframes' && atRules.body != null && atRules.name != null) {
        out.push(...parseKeyframeDraftBlock(atRules.body, atRules.name, wrappers))
      }
      continue
    }

    const style = parseStyleRule(text, i)
    i = style.end
    if (!style.selector || !style.body) continue
    out.push({
      wrappers,
      selector: style.selector.trim(),
      body: style.body,
    })
  }

  return out
}

type AtRuleParse =
  | { kind: 'skip'; end: number }
  | { kind: 'group'; prelude: string; body: string; end: number }
  | { kind: 'keyframes'; name: string; body: string; end: number }

function parseAtRule(text: string, start: number): AtRuleParse {
  const brace = findCharOutsideQuotes(text, '{', start)
  if (brace < 0) return { kind: 'skip', end: text.length }
  const prelude = text.slice(start, brace).trim()
  const bodyEnd = findMatchingBrace(text, brace)
  if (bodyEnd < 0) return { kind: 'skip', end: text.length }

  const lower = prelude.toLowerCase()
  if (lower.startsWith('@media') || lower.startsWith('@supports')) {
    return { kind: 'group', prelude, body: text.slice(brace + 1, bodyEnd), end: bodyEnd + 1 }
  }
  if (lower.startsWith('@keyframes')) {
    const name = prelude.replace(/^@keyframes\s+/i, '').trim()
    return { kind: 'keyframes', name, body: text.slice(brace + 1, bodyEnd), end: bodyEnd + 1 }
  }
  return { kind: 'skip', end: bodyEnd + 1 }
}

function parseKeyframeDraftBlock(
  body: string,
  keyframesName: string,
  wrappers: readonly string[],
): RecolorRuleDraft[] {
  const wrap = `@keyframes ${keyframesName}`
  return parseRuleDraftList(body, [...wrappers, wrap])
}

function parseStyleRule(
  text: string,
  start: number,
): { selector: string | null; body: string | null; end: number } {
  const brace = findCharOutsideQuotes(text, '{', start)
  if (brace < 0) return { selector: null, body: null, end: text.length }
  const selector = text.slice(start, brace).trim()
  const bodyEnd = findMatchingBrace(text, brace)
  if (bodyEnd < 0) return { selector: null, body: null, end: text.length }
  return {
    selector,
    body: text.slice(brace + 1, bodyEnd),
    end: bodyEnd + 1,
  }
}

function findCharOutsideQuotes(text: string, ch: string, from: number): number {
  let inSingle = false
  let inDouble = false
  for (let i = from; i < text.length; i += 1) {
    const c = text[i]!
    if (c === "'" && !inDouble) inSingle = !inSingle
    else if (c === '"' && !inSingle) inDouble = !inDouble
    else if (!inSingle && !inDouble && c === ch) return i
  }
  return -1
}

function findMatchingBrace(text: string, openIdx: number): number {
  if (text[openIdx] !== '{') return -1
  let depth = 0
  let inSingle = false
  let inDouble = false
  for (let i = openIdx; i < text.length; i += 1) {
    const c = text[i]!
    if (c === "'" && !inDouble) inSingle = !inSingle
    else if (c === '"' && !inSingle) inDouble = !inDouble
    else if (!inSingle && !inDouble) {
      if (c === '{') depth += 1
      else if (c === '}') {
        depth -= 1
        if (depth === 0) return i
      }
    }
  }
  return -1
}
