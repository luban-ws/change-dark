/**
 * RFC 0031 §3.3 / S2 & RFC 0036：CSS 文本 → 解析规则 → 变量图 + 改色 → 覆盖 stylesheet（只读原文，不原地改 cssRules）。
 *
 * §5.3：整表改色走 `batchModifyColors` 单次 WASM，禁逐色过桥。
 */

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
  ROOT_ATTR,
} from '@change-dark/extension-settings'
import { formatRgbHex, parseCssColorToken } from './color-parse'
import { recolorBackgroundImageDeclaration } from './background-image-css'
import { recolorBorderShorthandDeclaration } from './border-css'
import { recolorBoxShadowDeclaration } from './box-shadow-css'
import {
  collectRecolorRuleDrafts,
  splitCssDeclarations,
  stripCssComments,
  stripCssImportant,
  type RecolorRuleDraft,
} from './css-rule-parse'
import {
  buildCssVariableGraphFromDrafts,
  planVariableConsumerRecolor,
  planVariableDefinitionRecolors,
  type CssVariableGraph,
  type VariableBatchJob,
} from './css-variable-graph'
import { colorUseForCssProperty } from './modify-css'
import {
  DEFAULT_DARK_PROFILE,
  batchModifyColors,
  type ColorProfile,
  type ColorUse,
  type Rgb,
} from './modify-colors'
import { recolorLightDarkToPaletteVar } from './light-dark'
import { resolveThemedRecolorCssValue } from './palette-apply'

export { splitCssDeclarations, stripCssComments }

/** 单条可注入的覆盖规则（含 @media / @keyframes 外层包裹）。 */
export interface RecolorOverrideRule {
  /** 自外向内：如 `@media (min-width: 600px)` */
  wrappers: readonly string[]
  /** 规则选择器：`.foo` 或 keyframe 的 `0%` */
  selector: string
  /** 已改色且带 `!important` 的声明块 */
  declarations: string
}

/** RFC 0034：`recolor.cssVarSubstitute` 站点级 CSS 变量替换表。 */
export type CssVarSubstituteMap = Readonly<
  Record<string, { use: ColorUse; fallback?: string }>
>

export interface RecolorStylesheetOptions {
  cssVarSubstitute?: CssVarSubstituteMap
  variableGraph?: CssVariableGraph
  variableGraphMaxMs?: number
  now?: () => number
}

/** 单条声明改色计划。 */
interface DeclarationRecolorPlan {
  prop: string
  batch?: { rgb: Rgb; use: ColorUse }
  /** 渐变等不走 modifyColor 批次的已算好字面量 */
  literal?: string
  /** 变量图改写模板：`parts.length === batches.length + 1` */
  template?: {
    parts: readonly string[]
    batches: readonly VariableBatchJob[]
  }
}

const SIMPLE_CSS_VAR_RE = /^var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)$/i
const PAGE_VAR_BY_USE: Readonly<Record<ColorUse, string>> = {
  bg: `var(${CSS_VAR_PAGE_BG})`,
  fg: `var(${CSS_VAR_PAGE_FG})`,
  border: `var(${CSS_VAR_PAGE_BORDER})`,
}

function planCssVarSubstitute(
  prop: string,
  val: string,
  subs?: CssVarSubstituteMap,
): DeclarationRecolorPlan | null {
  if (!subs) return null
  const lowerProp = prop.toLowerCase()
  if (colorUseForCssProperty(prop) == null && lowerProp !== 'background') return null
  const match = SIMPLE_CSS_VAR_RE.exec(val)
  if (!match) return null
  const varName = match[1]!
  if (!Object.prototype.hasOwnProperty.call(subs, varName)) return null
  const sub = subs[varName]!
  const fb = sub.fallback?.trim()
  if (fb) {
    if (/^var\(/i.test(fb)) return { prop, literal: fb }
    const rgb = parseCssColorToken(fb)
    if (rgb) return { prop, batch: { rgb, use: sub.use } }
    return null
  }
  return { prop, literal: PAGE_VAR_BY_USE[sub.use] }
}

function toTemplatePlan(
  prop: string,
  parts: readonly string[],
  batches: readonly VariableBatchJob[],
): DeclarationRecolorPlan {
  if (batches.length === 0) {
    return { prop, literal: parts[0] ?? '' }
  }
  return { prop, template: { parts, batches } }
}

function planDeclarationRecolors(
  property: string,
  rawValue: string,
  options: RecolorStylesheetOptions = {},
  graph?: CssVariableGraph,
): DeclarationRecolorPlan[] {
  const prop = property.trim()
  const val = stripCssImportant(rawValue)

  const lightDarkLiteral = recolorLightDarkToPaletteVar(val)
  if (lightDarkLiteral) {
    if (prop.startsWith('--') && /-line|-hairline|-ring|-stroke|-divider|-border/i.test(prop)) {
      return [{ prop, literal: `var(${CSS_VAR_PAGE_BORDER})` }]
    }
    return [{ prop, literal: lightDarkLiteral }]
  }

  const varSubPlan = planCssVarSubstitute(prop, val, options.cssVarSubstitute)
  if (varSubPlan) return [varSubPlan]

  if (graph) {
    if (prop.startsWith('--')) {
      const defPlans = planVariableDefinitionRecolors(prop, val, graph)
      if (defPlans.length > 0) {
        return defPlans.map((p) => toTemplatePlan(p.prop, p.parts, p.batches))
      }
      return []
    }
    if (/var\s*\(/i.test(val)) {
      const consumerPlan = planVariableConsumerRecolor(prop, val, graph)
      if (consumerPlan) {
        return [
          toTemplatePlan(
            consumerPlan.prop,
            consumerPlan.parts,
            consumerPlan.batches,
          ),
        ]
      }
      return []
    }
  }

  const use = colorUseForCssProperty(prop)
  if (use) {
    const rgb = parseCssColorToken(val)
    if (!rgb) return []
    return [{ prop, batch: { rgb, use } }]
  }

  const bgLiteral = recolorBackgroundImageDeclaration(prop, val)
  if (bgLiteral) return [{ prop, literal: bgLiteral }]
  const borderLiteral = recolorBorderShorthandDeclaration(prop, val)
  if (borderLiteral) return [{ prop, literal: borderLiteral }]
  const shadowLiteral = recolorBoxShadowDeclaration(prop, val)
  if (shadowLiteral) return [{ prop, literal: shadowLiteral }]
  return []
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

function appendPlanBatches(
  plans: readonly DeclarationRecolorPlan[],
  batchJobs: Array<{ rgb: Rgb; use: ColorUse }>,
): void {
  for (const plan of plans) {
    if (plan.batch) {
      batchJobs.push(plan.batch)
    } else if (plan.template) {
      for (const b of plan.template.batches) {
        batchJobs.push(b)
      }
    }
  }
}

function materializeDeclarationPlans(
  plans: readonly DeclarationRecolorPlan[],
  batchResults: readonly Rgb[],
  cursorRef: { index: number },
): string {
  return plans
    .map((plan) => {
      if (plan.literal != null) {
        return formatRecoloredDeclaration(plan.prop, plan.literal)
      }
      if (plan.template != null) {
        const { parts, batches } = plan.template
        let built = parts[0] ?? ''
        for (let i = 0; i < batches.length; i += 1) {
          const out = batchResults[cursorRef.index]!
          cursorRef.index += 1
          built += formatRgbHex(out) + (parts[i + 1] ?? '')
        }
        return formatRecoloredDeclaration(plan.prop, built)
      }
      const batch = plan.batch!
      const out = batchResults[cursorRef.index]!
      cursorRef.index += 1
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
  options: RecolorStylesheetOptions = {},
): string {
  const plans: DeclarationRecolorPlan[] = []
  for (const decl of splitCssDeclarations(block)) {
    const colon = decl.indexOf(':')
    if (colon < 0) continue
    plans.push(
      ...planDeclarationRecolors(
        decl.slice(0, colon),
        decl.slice(colon + 1),
        options,
        options.variableGraph,
      ),
    )
  }
  if (plans.length === 0) return ''
  const batchJobs: Array<{ rgb: Rgb; use: ColorUse }> = []
  appendPlanBatches(plans, batchJobs)
  const batchResults = batchModifyColors(batchJobs, profile)
  return materializeDeclarationPlans(plans, batchResults, { index: 0 })
}

/** 为覆盖规则加 `html[ROOT_ATTR]` 前缀；@keyframes 步骤选择器保持不变。
 *  见 CLAUDE.md — `:root` / `:host` / `html` 即根元素，禁止 `html[x] :root` 或 `html[x] html` 后代写法。 */
function prefixSelectorPart(part: string): string {
  const p = part.trim()
  if (!p) return `html[${ROOT_ATTR}]`
  const rootMatch = /^(:root|:host|html)(?=$|[.\[:#\s>+~])/.exec(p)
  if (rootMatch) {
    const rest = p.slice(rootMatch[1]!.length)
    return rest ? `html[${ROOT_ATTR}]${rest}` : `html[${ROOT_ATTR}]`
  }
  if (p.startsWith('[')) return `html[${ROOT_ATTR}]${p}`
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
  options: RecolorStylesheetOptions = {},
): string {
  const rules = collectRecolorOverrideRules(cssText, profile, options)
  return rules.map(formatRecolorOverrideRule).join('\n\n')
}

/** 解析并收集所有需注入的改色规则。 */
export function collectRecolorOverrideRules(
  cssText: string,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  options: RecolorStylesheetOptions = {},
): RecolorOverrideRule[] {
  const drafts = collectRecolorRuleDrafts(cssText)
  return buildRulesFromDrafts(drafts, profile, options)
}

function buildRulesFromDrafts(
  drafts: readonly RecolorRuleDraft[],
  profile: ColorProfile,
  options: RecolorStylesheetOptions = {},
): RecolorOverrideRule[] {
  const graph =
    options.variableGraph ??
    buildCssVariableGraphFromDrafts(drafts, {
      maxMs: options.variableGraphMaxMs,
      now: options.now,
    })

  const perDraftPlans: DeclarationRecolorPlan[][] = []
  const batchJobs: Array<{ rgb: Rgb; use: ColorUse }> = []

  for (const draft of drafts) {
    const plans: DeclarationRecolorPlan[] = []
    for (const decl of splitCssDeclarations(draft.body)) {
      const colon = decl.indexOf(':')
      if (colon < 0) continue
      plans.push(
        ...planDeclarationRecolors(
          decl.slice(0, colon),
          decl.slice(colon + 1),
          options,
          graph,
        ),
      )
    }
    appendPlanBatches(plans, batchJobs)
    perDraftPlans.push(plans)
  }

  const batchResults = batchModifyColors(batchJobs, profile)
  const cursorRef = { index: 0 }
  const rules: RecolorOverrideRule[] = []

  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i]!
    const plans = perDraftPlans[i]!
    if (plans.length === 0) continue

    const declarations = materializeDeclarationPlans(plans, batchResults, cursorRef)
    rules.push({
      wrappers: draft.wrappers,
      selector: draft.selector,
      declarations,
    })
  }

  return rules
}
