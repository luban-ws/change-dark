/**
 * RFC 0031 / RFC 0036：纯文本 CSS 规则与声明拆分（无 DOM 依赖）。
 * 抽离自 `css-stylesheet.ts`，供变量图与覆盖层生成器共享，避免循环依赖。
 */

/** 解析阶段规则草稿（尚未改色）。 */
export interface RecolorRuleDraft {
  wrappers: readonly string[]
  selector: string
  body: string
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

/** 剥离声明尾部 `!important`。 */
export function stripCssImportant(value: string): string {
  return value.trim().replace(/\s*!important\s*$/i, '').trim()
}

type AtRuleParse =
  | { kind: 'skip'; end: number }
  | { kind: 'group'; prelude: string; body: string; end: number }
  | { kind: 'keyframes'; name: string; body: string; end: number }

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

/** 解析整段 CSS 文本为扁平 `RecolorRuleDraft[]`（展开 `@media`/`@supports`/`@keyframes`）。 */
export function collectRecolorRuleDrafts(cssText: string): RecolorRuleDraft[] {
  const src = stripCssComments(cssText).trim()
  if (!src) return []
  return parseRuleDraftList(src, [])
}
