/**
 * RFC 0036：CSS 变量改色图（S0–S2，对齐 Dark Reader `VariablesStore`）。
 *
 * - S0：从可读 stylesheet 解析 `--*` 定义、消费者用法与变量依赖图（集合表达多用途）。
 * - S1：中性颜色定义按推断用途输出 `--cd-recolor-{bg|fg|border}--*` 包装变量；
 *       原作者 `--*` 定义保持原值不变；品牌/高饱和色走 WASM `batchModifyColors`。
 * - S2：改写简单 `var(--name)`、嵌套链与 fallback 消费者；
 *       构造色表达式（如 `rgb(var(--r)...)` / `color-mix(...)`）与循环/未知依赖安全跳过。
 */

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
  computeDeadlineMs,
  isPastDeadline,
} from '@change-dark/extension-settings'
import { parseCssColorToken } from './color-parse'
import {
  collectRecolorRuleDrafts,
  splitCssDeclarations,
  stripCssImportant,
  type RecolorRuleDraft,
} from './css-rule-parse'
import { recolorLightDarkToPaletteVar } from './light-dark'
import type { ColorUse, Rgb } from './modify-colors'
import { isNeutralPaletteCandidate, relativeRgbLuma } from './palette-apply'

export const CD_RECOLOR_VAR_PREFIX = '--cd-recolor-' as const

const CUSTOM_PROP_NAME_RE = /^--[^\s(),:;'"\\]+$/
const BORDER_WIDTH_RE = /^(\d+(?:\.\d+)?)\s*(px|rem|em)?\b/i
const BUDGET_CHECK_INTERVAL = 64
const MAX_VAR_CHAIN_DEPTH = 16

const PAGE_VAR_BY_USE: Readonly<Record<ColorUse, string>> = {
  bg: `var(${CSS_VAR_PAGE_BG})`,
  fg: `var(${CSS_VAR_PAGE_FG})`,
  border: `var(${CSS_VAR_PAGE_BORDER})`,
}

const USE_OUTPUT_ORDER: readonly ColorUse[] = ['bg', 'fg', 'border']

const LONGHAND_VAR_USES: Readonly<Record<string, ColorUse>> = {
  'background-color': 'bg',
  background: 'bg',
  color: 'fg',
  'caret-color': 'fg',
  'text-decoration-color': 'fg',
  fill: 'fg',
  'border-color': 'border',
  'border-top-color': 'border',
  'border-right-color': 'border',
  'border-bottom-color': 'border',
  'border-left-color': 'border',
  'outline-color': 'border',
  'column-rule-color': 'border',
  stroke: 'border',
}

const BORDER_SHORTHAND_PROPS = new Set([
  'border',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
  'outline',
])

export interface ParsedVarRef {
  name: string
  fallback?: string
  start: number
  end: number
}

export type VariableDefinitionKind = 'color' | 'var' | 'light-dark' | 'unknown'

export interface CssVariableDefinition {
  kind: VariableDefinitionKind
  rawValue: string
  rgb?: Rgb
  varRef?: ParsedVarRef
}

export interface CssVariableNode {
  name: string
  uses: Set<ColorUse>
  definitions: CssVariableDefinition[]
  dependencies: Set<string>
  dependents: Set<string>
  isCyclic: boolean
  isResolvableColor: boolean
  hasLightDarkDefinition: boolean
}

export interface CssVariableGraphStats {
  totalNodes: number
  resolvableNodes: number
  skippedCyclic: number
  skippedConstructive: number
  skippedUnknown: number
  budgetExceeded: boolean
}

export interface CssVariableGraph {
  nodes: Map<string, CssVariableNode>
  lightDarkVariables: Set<string>
  stats: CssVariableGraphStats
}

export interface BuildCssVariableGraphOptions {
  maxMs?: number
  now?: () => number
}

export interface VariableBatchJob {
  rgb: Rgb
  use: ColorUse
}

export interface VariableDeclarationRewritePlan {
  prop: string
  parts: readonly string[]
  batches: readonly VariableBatchJob[]
}

/** 按用途生成扩展私有包装变量名（例如 `--surface` + `'bg'` → `--cd-recolor-bg--surface`）。 */
export function wrapperVarName(authorVarName: string, use: ColorUse): string {
  const bare = authorVarName.startsWith('--') ? authorVarName.slice(2) : authorVarName
  return `${CD_RECOLOR_VAR_PREFIX}${use}--${bare}`
}

function isIdentChar(ch: string | undefined): boolean {
  return ch != null && /[a-zA-Z0-9_-]/.test(ch)
}

function matchVarFunctionAt(input: string, index: number): number {
  if (isIdentChar(input[index - 1])) return -1
  if (input.slice(index, index + 3).toLowerCase() !== 'var') return -1
  let j = index + 3
  while (j < input.length && /\s/.test(input[j]!)) j += 1
  return input[j] === '(' ? j : -1
}

function scanBalancedVarAt(
  input: string,
  varStart: number,
  openParenIdx: number,
): ParsedVarRef | null {
  let depth = 0
  let inSingle = false
  let inDouble = false
  let escape = false
  let commaIdx = -1

  for (let i = openParenIdx; i < input.length; i += 1) {
    const ch = input[i]!
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && (inSingle || inDouble)) {
      escape = true
      continue
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      continue
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      continue
    }
    if (inSingle || inDouble) continue

    if (ch === '(') {
      depth += 1
    } else if (ch === ')') {
      depth -= 1
      if (depth === 0) {
        const namePart = (
          commaIdx >= 0
            ? input.slice(openParenIdx + 1, commaIdx)
            : input.slice(openParenIdx + 1, i)
        ).trim()
        if (!CUSTOM_PROP_NAME_RE.test(namePart)) return null
        const fbRaw =
          commaIdx >= 0 ? input.slice(commaIdx + 1, i).trim() : undefined
        return {
          name: namePart,
          fallback: fbRaw && fbRaw.length > 0 ? fbRaw : undefined,
          start: varStart,
          end: i + 1,
        }
      }
    } else if (ch === ',' && depth === 1 && commaIdx < 0) {
      commaIdx = i
    }
  }

  return null
}

/** 若整串为单个 `var(--x)` 或 `var(--x, fallback)`，解析其变量名与 fallback。 */
export function parseSingleVarExpression(value: string): ParsedVarRef | null {
  const s = value.trim()
  if (!s) return null
  const openIdx = matchVarFunctionAt(s, 0)
  if (openIdx < 0) return null
  const parsed = scanBalancedVarAt(s, 0, openIdx)
  if (!parsed || parsed.end !== s.length) return null
  return parsed
}

/** 扫描声明值顶层（depth 0）所有 `var(...)` 调用（尊重括号嵌套与引号）。 */
export function findTopLevelVarRefs(value: string): ParsedVarRef[] {
  const refs: ParsedVarRef[] = []
  let depth = 0
  let inSingle = false
  let inDouble = false
  let escape = false

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]!
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && (inSingle || inDouble)) {
      escape = true
      continue
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      continue
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      continue
    }
    if (inSingle || inDouble) continue

    if (depth === 0) {
      const openIdx = matchVarFunctionAt(value, i)
      if (openIdx >= 0) {
        const parsed = scanBalancedVarAt(value, i, openIdx)
        if (parsed) {
          refs.push(parsed)
          i = parsed.end - 1
          continue
        }
      }
    }

    if (ch === '(') depth += 1
    else if (ch === ')' && depth > 0) depth -= 1
  }

  return refs
}

/**
 * 检测构造色 / 计算表达式：如 `rgb(var(--r), var(--g), var(--b))`、`color-mix(... var(--a) ...)`、
 * `linear-gradient(... var(--a) ...)`、`calc(... var(--x) ...)` 等 `var()` 嵌套在非 `var` 函数内时返回 true。
 * 纯嵌套 `var(--a, var(--b))` 返回 false（可安全图改写）。
 */
export function isUnsafeConstructiveVarValue(value: string): boolean {
  const parenStack: Array<string | null> = []
  let inSingle = false
  let inDouble = false
  let escape = false
  let fnToken = ''

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]!
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && (inSingle || inDouble)) {
      escape = true
      continue
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      fnToken = ''
      continue
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      fnToken = ''
      continue
    }
    if (inSingle || inDouble) continue

    if (isIdentChar(ch)) {
      fnToken += ch
      continue
    }

    if (ch === '(') {
      const fnName = fnToken.toLowerCase()
      if (
        fnName === 'var' &&
        parenStack.some((outer) => outer !== null && outer !== 'var')
      ) {
        return true
      }
      parenStack.push(fnName || null)
      fnToken = ''
      continue
    }

    if (!/\s/.test(ch)) {
      fnToken = ''
    }

    if (ch === ')' && parenStack.length > 0) {
      parenStack.pop()
    }
  }

  return false
}

/** 推断 CSS 属性携带 `var(--*)` 时的语义色用途（`bg` / `fg` / `border`）。 */
export function variableColorUseForCssProperty(
  property: string,
  value = '',
): ColorUse | null {
  const prop = property.trim().toLowerCase()
  const direct = LONGHAND_VAR_USES[prop]
  if (direct) return direct

  if (BORDER_SHORTHAND_PROPS.has(prop)) {
    const m = BORDER_WIDTH_RE.exec(value.trim())
    if (!m) return 'border'
    const width = parseFloat(m[1]!)
    if (!Number.isFinite(width)) return 'border'
    const unit = (m[2] ?? 'px').toLowerCase()
    const px = unit === 'rem' || unit === 'em' ? width * 16 : width
    return px >= 8 ? 'bg' : 'border'
  }

  return null
}

function isExtensionOwnedVar(name: string): boolean {
  return name.startsWith('--cd-')
}

function collectRefChainVarNames(ref: ParsedVarRef, out: Set<string>, depth = 0): void {
  if (depth > MAX_VAR_CHAIN_DEPTH) return
  if (!isExtensionOwnedVar(ref.name)) {
    out.add(ref.name)
  }
  if (!ref.fallback) return
  for (const fbRef of findTopLevelVarRefs(ref.fallback)) {
    collectRefChainVarNames(fbRef, out, depth + 1)
  }
}

function getOrCreateNode(
  nodes: Map<string, CssVariableNode>,
  name: string,
): CssVariableNode {
  let node = nodes.get(name)
  if (!node) {
    node = {
      name,
      uses: new Set(),
      definitions: [],
      dependencies: new Set(),
      dependents: new Set(),
      isCyclic: false,
      isResolvableColor: false,
      hasLightDarkDefinition: false,
    }
    nodes.set(name, node)
  }
  return node
}

function propagateUsesToDependencies(nodes: Map<string, CssVariableNode>): void {
  const queue: CssVariableNode[] = []
  const queued = new Set<string>()

  for (const node of nodes.values()) {
    if (node.uses.size > 0) {
      queue.push(node)
      queued.add(node.name)
    }
  }

  let cursor = 0
  while (cursor < queue.length) {
    const node = queue[cursor]!
    cursor += 1
    queued.delete(node.name)

    for (const depName of node.dependencies) {
      const depNode = nodes.get(depName)
      if (!depNode) continue
      let added = false
      for (const use of node.uses) {
        if (!depNode.uses.has(use)) {
          depNode.uses.add(use)
          added = true
        }
      }
      if (added && !queued.has(depNode.name)) {
        queue.push(depNode)
        queued.add(depNode.name)
      }
    }
  }
}

interface ResolveEval {
  resolvable: boolean
  cyclic: boolean
}

function evaluateGraphResolvability(
  nodes: Map<string, CssVariableNode>,
  lightDarkVariables: Set<string>,
): void {
  const visiting = new Set<string>()
  const cache = new Map<string, ResolveEval>()

  const evalVarRef = (ref: ParsedVarRef, depth: number): ResolveEval => {
    if (depth > MAX_VAR_CHAIN_DEPTH) return { resolvable: false, cyclic: false }
    if (isExtensionOwnedVar(ref.name) || lightDarkVariables.has(ref.name)) {
      return { resolvable: false, cyclic: false }
    }
    if (visiting.has(ref.name)) {
      return { resolvable: false, cyclic: true }
    }

    const primaryRes = evalNode(ref.name)
    if (primaryRes.cyclic) {
      return { resolvable: false, cyclic: true }
    }

    if (ref.fallback) {
      const fbSingle = parseSingleVarExpression(ref.fallback)
      if (fbSingle) {
        const fbRes = evalVarRef(fbSingle, depth + 1)
        if (fbRes.cyclic) return { resolvable: false, cyclic: true }
        return {
          resolvable: primaryRes.resolvable || fbRes.resolvable,
          cyclic: false,
        }
      }
      if (parseCssColorToken(ref.fallback)) {
        return { resolvable: true, cyclic: false }
      }
    }

    return primaryRes
  }

  const evalNode = (name: string): ResolveEval => {
    const cached = cache.get(name)
    if (cached) return cached
    if (lightDarkVariables.has(name)) {
      return { resolvable: false, cyclic: false }
    }
    const node = nodes.get(name)
    if (!node || node.definitions.length === 0) {
      return { resolvable: false, cyclic: false }
    }

    visiting.add(name)
    let hasResolvable = false
    let hasCyclic = false

    for (const def of node.definitions) {
      if (def.kind === 'color') {
        hasResolvable = true
      } else if (def.kind === 'var' && def.varRef) {
        const r = evalVarRef(def.varRef, 0)
        if (r.cyclic) hasCyclic = true
        if (r.resolvable) hasResolvable = true
      }
    }

    visiting.delete(name)
    const result: ResolveEval = hasCyclic
      ? { resolvable: false, cyclic: true }
      : { resolvable: hasResolvable, cyclic: false }
    node.isCyclic = result.cyclic
    node.isResolvableColor = result.resolvable
    cache.set(name, result)
    return result
  }

  for (const name of nodes.keys()) {
    evalNode(name)
  }
}

/** S0：从已解析规则草稿构建 CSS 变量改色图（含可选预算保护与用途传播）。 */
export function buildCssVariableGraphFromDrafts(
  drafts: readonly RecolorRuleDraft[],
  options: BuildCssVariableGraphOptions = {},
): CssVariableGraph {
  const nodes = new Map<string, CssVariableNode>()
  const lightDarkVariables = new Set<string>()
  const now = options.now ?? (() => Date.now())
  const hasBudget = options.maxMs != null && options.maxMs > 0
  const deadline = hasBudget ? computeDeadlineMs(now(), options.maxMs!) : Infinity

  let skippedConstructive = 0
  let skippedUnknown = 0
  let budgetExceeded = false

  for (let i = 0; i < drafts.length; i += 1) {
    if (hasBudget && i > 0 && i % BUDGET_CHECK_INTERVAL === 0) {
      if (isPastDeadline(now(), deadline)) {
        budgetExceeded = true
        break
      }
    }

    const draft = drafts[i]!
    const innerWrapper = draft.wrappers[draft.wrappers.length - 1]
    if (innerWrapper && innerWrapper.toLowerCase().startsWith('@keyframes')) {
      continue
    }

    for (const decl of splitCssDeclarations(draft.body)) {
      const colon = decl.indexOf(':')
      if (colon < 0) continue
      const prop = decl.slice(0, colon).trim()
      const val = stripCssImportant(decl.slice(colon + 1))

      if (prop.startsWith('--')) {
        if (isExtensionOwnedVar(prop) || !CUSTOM_PROP_NAME_RE.test(prop)) continue
        const node = getOrCreateNode(nodes, prop)

        if (recolorLightDarkToPaletteVar(val) != null) {
          node.definitions.push({ kind: 'light-dark', rawValue: val })
          node.hasLightDarkDefinition = true
          lightDarkVariables.add(prop)
          continue
        }

        if (isUnsafeConstructiveVarValue(val)) {
          node.definitions.push({ kind: 'unknown', rawValue: val })
          skippedConstructive += 1
          continue
        }

        const varRef = parseSingleVarExpression(val)
        if (varRef) {
          node.definitions.push({ kind: 'var', rawValue: val, varRef })
          const deps = new Set<string>()
          collectRefChainVarNames(varRef, deps)
          for (const depName of deps) {
            node.dependencies.add(depName)
            const depNode = getOrCreateNode(nodes, depName)
            depNode.dependents.add(prop)
          }
          continue
        }

        const rgb = parseCssColorToken(val)
        if (rgb) {
          node.definitions.push({ kind: 'color', rawValue: val, rgb })
          continue
        }

        node.definitions.push({ kind: 'unknown', rawValue: val })
        skippedUnknown += 1
        continue
      }

      const use = variableColorUseForCssProperty(prop, val)
      if (!use || !/var\s*\(/i.test(val)) continue
      if (isUnsafeConstructiveVarValue(val)) {
        skippedConstructive += 1
        continue
      }

      const refs = findTopLevelVarRefs(val)
      for (const ref of refs) {
        const refNames = new Set<string>()
        collectRefChainVarNames(ref, refNames)
        for (const varName of refNames) {
          const node = getOrCreateNode(nodes, varName)
          node.uses.add(use)
        }
      }
    }
  }

  propagateUsesToDependencies(nodes)
  evaluateGraphResolvability(nodes, lightDarkVariables)

  let resolvableNodes = 0
  let skippedCyclic = 0
  for (const node of nodes.values()) {
    if (node.isCyclic) skippedCyclic += 1
    if (node.isResolvableColor) resolvableNodes += 1
  }

  return {
    nodes,
    lightDarkVariables,
    stats: {
      totalNodes: nodes.size,
      resolvableNodes,
      skippedCyclic,
      skippedConstructive,
      skippedUnknown,
      budgetExceeded,
    },
  }
}

/** S0：直接从一段或多段 stylesheet CSS 文本构建变量改色图。 */
export function buildCssVariableGraph(
  cssInput: string | readonly string[],
  options: BuildCssVariableGraphOptions = {},
): CssVariableGraph {
  const combined =
    typeof cssInput === 'string' ? cssInput : cssInput.join('\n\n')
  const drafts = collectRecolorRuleDrafts(combined)
  return buildCssVariableGraphFromDrafts(drafts, options)
}

function planVariableColorValue(
  rgb: Rgb,
  use: ColorUse,
  isMultiUse: boolean,
): { literal?: string; batch?: VariableBatchJob } {
  if (!isNeutralPaletteCandidate(rgb)) {
    return { batch: { rgb, use } }
  }
  const l = relativeRgbLuma(rgb)
  switch (use) {
    case 'bg':
      return l > 0.38
        ? { literal: PAGE_VAR_BY_USE.bg }
        : { batch: { rgb, use } }
    case 'fg':
      return l < 0.65 || isMultiUse
        ? { literal: PAGE_VAR_BY_USE.fg }
        : { batch: { rgb, use } }
    case 'border':
      return { literal: PAGE_VAR_BY_USE.border }
  }
}

interface RewrittenVarPiece {
  parts: string[]
  batches: VariableBatchJob[]
}

function appendLiteral(piece: RewrittenVarPiece, text: string): void {
  const lastIdx = piece.parts.length - 1
  piece.parts[lastIdx] = `${piece.parts[lastIdx] ?? ''}${text}`
}

function appendPiece(target: RewrittenVarPiece, child: RewrittenVarPiece): void {
  appendLiteral(target, child.parts[0] ?? '')
  for (let i = 0; i < child.batches.length; i += 1) {
    target.batches.push(child.batches[i]!)
    target.parts.push(child.parts[i + 1] ?? '')
  }
}

function rewriteVarRefForUse(
  ref: ParsedVarRef,
  use: ColorUse,
  graph: CssVariableGraph,
  isMultiUse: boolean,
  depth = 0,
): RewrittenVarPiece | null {
  if (depth > MAX_VAR_CHAIN_DEPTH) return null
  if (isExtensionOwnedVar(ref.name) || graph.lightDarkVariables.has(ref.name)) {
    return null
  }

  const node = graph.nodes.get(ref.name)
  if (node?.isCyclic) return null
  const primaryResolvable = Boolean(node?.isResolvableColor)

  if (!ref.fallback) {
    if (!primaryResolvable) return null
    return {
      parts: [`var(${wrapperVarName(ref.name, use)})`],
      batches: [],
    }
  }

  const wrapperRefName = wrapperVarName(ref.name, use)
  const fbSingle = parseSingleVarExpression(ref.fallback)
  if (fbSingle) {
    const fbNode = graph.nodes.get(fbSingle.name)
    if (fbNode?.isCyclic) return null
    const fbRewritten = rewriteVarRefForUse(
      fbSingle,
      use,
      graph,
      isMultiUse,
      depth + 1,
    )
    if (!fbRewritten) {
      if (!primaryResolvable) return null
      return {
        parts: [`var(${wrapperRefName}, ${ref.fallback})`],
        batches: [],
      }
    }
    const piece: RewrittenVarPiece = {
      parts: [`var(${wrapperRefName}, `],
      batches: [],
    }
    appendPiece(piece, fbRewritten)
    appendLiteral(piece, ')')
    return piece
  }

  const fbRgb = parseCssColorToken(ref.fallback)
  if (fbRgb) {
    const colorPlan = planVariableColorValue(fbRgb, use, isMultiUse)
    if (colorPlan.literal != null) {
      return {
        parts: [`var(${wrapperRefName}, ${colorPlan.literal})`],
        batches: [],
      }
    }
    return {
      parts: [`var(${wrapperRefName}, `, ')'],
      batches: [colorPlan.batch!],
    }
  }

  if (!primaryResolvable) return null
  return {
    parts: [`var(${wrapperRefName}, ${ref.fallback})`],
    batches: [],
  }
}

/** S1：为作者自定义属性 `--*` 按推断用途生成私有包装变量声明计划，保持原 `--*` 不变。 */
export function planVariableDefinitionRecolors(
  prop: string,
  val: string,
  graph: CssVariableGraph,
): VariableDeclarationRewritePlan[] {
  const node = graph.nodes.get(prop)
  if (
    !node ||
    node.hasLightDarkDefinition ||
    node.isCyclic ||
    !node.isResolvableColor ||
    node.uses.size === 0
  ) {
    return []
  }

  const orderedUses = USE_OUTPUT_ORDER.filter((u) => node.uses.has(u))
  if (orderedUses.length === 0) return []
  const isMultiUse = node.uses.size > 1

  const rgb = parseCssColorToken(val)
  if (rgb) {
    return orderedUses.map((use) => {
      const colorPlan = planVariableColorValue(rgb, use, isMultiUse)
      const targetProp = wrapperVarName(prop, use)
      if (colorPlan.literal != null) {
        return { prop: targetProp, parts: [colorPlan.literal], batches: [] }
      }
      return {
        prop: targetProp,
        parts: ['', ''],
        batches: [colorPlan.batch!],
      }
    })
  }

  if (isUnsafeConstructiveVarValue(val)) return []
  const varRef = parseSingleVarExpression(val)
  if (!varRef) return []

  const plans: VariableDeclarationRewritePlan[] = []
  for (const use of orderedUses) {
    const rewritten = rewriteVarRefForUse(varRef, use, graph, isMultiUse)
    if (!rewritten) continue
    plans.push({
      prop: wrapperVarName(prop, use),
      parts: rewritten.parts,
      batches: rewritten.batches,
    })
  }
  return plans
}

/** S2：改写消费者属性上的 `var(--*)` 调用（含嵌套与 fallback），未知/循环变量安全跳过。 */
export function planVariableConsumerRecolor(
  prop: string,
  val: string,
  graph: CssVariableGraph,
): VariableDeclarationRewritePlan | null {
  const use = variableColorUseForCssProperty(prop, val)
  if (!use || !/var\s*\(/i.test(val) || isUnsafeConstructiveVarValue(val)) {
    return null
  }

  const refs = findTopLevelVarRefs(val)
  if (refs.length === 0) return null

  const out: RewrittenVarPiece = { parts: [''], batches: [] }
  let cursor = 0
  let anyChanged = false

  for (const ref of refs) {
    const node = graph.nodes.get(ref.name)
    if (node?.isCyclic) return null

    const rewritten = rewriteVarRefForUse(
      ref,
      use,
      graph,
      (node?.uses.size ?? 0) > 1,
    )
    appendLiteral(out, val.slice(cursor, ref.start))
    if (rewritten) {
      appendPiece(out, rewritten)
      anyChanged = true
    } else {
      appendLiteral(out, val.slice(ref.start, ref.end))
    }
    cursor = ref.end
  }

  if (!anyChanged) return null
  appendLiteral(out, val.slice(cursor))
  return {
    prop,
    parts: out.parts,
    batches: out.batches,
  }
}
