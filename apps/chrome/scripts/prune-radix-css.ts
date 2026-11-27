/**
 * Build-time CSS pruner for `@radix-ui/themes/styles.css` in the fixed 380x600 dark popup.
 * Removes unused responsive breakpoints (>= 520px), unused color scales, light-only rules,
 * and unused Radix component selectors while preserving balanced braces and all active tokens.
 */

const UNUSED_COLOR_SCALES = [
  'amber',
  'blue',
  'bronze',
  'brown',
  'crimson',
  'gold',
  'grass',
  'green',
  'indigo',
  'iris',
  'jade',
  'lime',
  'mauve',
  'mint',
  'olive',
  'orange',
  'pink',
  'plum',
  'purple',
  'ruby',
  'sage',
  'sand',
  'sky',
  'teal',
  'tomato',
  'violet',
  'yellow',
] as const

const UNUSED_COLOR_SET = new Set<string>(UNUSED_COLOR_SCALES)

const UNUSED_COMPONENT_PREFIXES = [
  '.rt-AlertDialog',
  '.rt-Avatar',
  '.rt-Badge',
  '.rt-Blockquote',
  '.rt-Callout',
  '.rt-Checkbox',
  '.rt-Code',
  '.rt-Container',
  '.rt-ContextMenu',
  '.rt-DataList',
  '.rt-Dialog',
  '.rt-DropdownMenu',
  '.rt-Em',
  '.rt-Grid',
  '.rt-HoverCard',
  '.rt-IconButton',
  '.rt-Inset',
  '.rt-Kbd',
  '.rt-Link',
  '.rt-Popover',
  '.rt-Progress',
  '.rt-Quote',
  '.rt-Radio',
  '.rt-Section',
  '.rt-Separator',
  '.rt-Skeleton',
  '.rt-Spinner',
  '.rt-Strong',
  '.rt-TabNav',
  '.rt-Table',
  '.rt-ThemePanel',
  '.rt-Tooltip',
] as const

const UNUSED_COLOR_ATTR_RE = new RegExp(
  `\\[(?:data-accent-color|data-gray-color)=['"]?(?:${UNUSED_COLOR_SCALES.join('|')})['"]?\\]`,
)

const UNUSED_COLOR_PROP_RE = new RegExp(
  `^--(${UNUSED_COLOR_SCALES.join('|')})-(?:a?\\d{1,2}|contrast|surface|indicator|track)$`,
)

const MEDIA_MIN_WIDTH_RE = /@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)/i

function splitTopLevelSelectors(prelude: string): string[] {
  const parts: string[] = []
  let depthParen = 0
  let depthBracket = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < prelude.length; i += 1) {
    const ch = prelude[i]!
    if (quote) {
      if (ch === '\\') {
        i += 1
        continue
      }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '(') depthParen += 1
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1)
    else if (ch === '[') depthBracket += 1
    else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1)
    else if (ch === ',' && depthParen === 0 && depthBracket === 0) {
      parts.push(prelude.slice(start, i).trim())
      start = i + 1
    }
  }
  const tail = prelude.slice(start).trim()
  if (tail) parts.push(tail)
  return parts
}

function isUnusedColorSelector(selector: string): boolean {
  return UNUSED_COLOR_ATTR_RE.test(selector)
}

function isLightOnlySelector(selector: string): boolean {
  if (/\.dark\b|\.dark-theme\b|:root\b|:not\(\s*\.light\b/i.test(selector)) {
    return false
  }
  return /(?:^|[\s>,+~:(])(?:\.light|\.light-theme)\b/.test(selector)
}

function isUnusedComponentSelector(selector: string): boolean {
  return UNUSED_COMPONENT_PREFIXES.some((prefix) => {
    let idx = selector.indexOf(prefix)
    while (idx !== -1) {
      const next = selector[idx + prefix.length] ?? ''
      if (!/[a-z0-9_-]/i.test(next) || /[A-Z]/.test(next)) {
        return true
      }
      idx = selector.indexOf(prefix, idx + prefix.length)
    }
    return false
  })
}

function shouldDropRulePrelude(prelude: string): boolean {
  const selectors = splitTopLevelSelectors(prelude)
  if (selectors.length === 0) return false
  if (selectors.every(isUnusedColorSelector)) return true
  if (selectors.every(isLightOnlySelector)) return true
  if (selectors.every(isUnusedComponentSelector)) return true
  return false
}

function shouldDropAtRule(prelude: string): boolean {
  const match = prelude.match(MEDIA_MIN_WIDTH_RE)
  if (!match) return false
  const px = Number(match[1])
  return Number.isFinite(px) && px >= 520
}

function pruneDeclarations(body: string): string {
  const out: string[] = []
  let i = 0
  const n = body.length
  while (i < n) {
    // Skip whitespace & comments
    while (i < n && /\s/.test(body[i]!)) i += 1
    if (i >= n) break
    if (body[i] === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2)
      i = end === -1 ? n : end + 2
      continue
    }

    // Read single declaration until top-level `;` or end
    const start = i
    let depthParen = 0
    let quote = ''
    while (i < n) {
      const ch = body[i]!
      if (quote) {
        if (ch === '\\') {
          i += 2
          continue
        }
        if (ch === quote) quote = ''
        i += 1
        continue
      }
      if (ch === '"' || ch === "'") {
        quote = ch
        i += 1
        continue
      }
      if (ch === '(') depthParen += 1
      else if (ch === ')') depthParen = Math.max(0, depthParen - 1)
      else if (ch === ';' && depthParen === 0) {
        i += 1
        break
      }
      i += 1
    }

    const decl = body.slice(start, i).trim()
    if (!decl) continue
    const colon = decl.indexOf(':')
    if (colon !== -1) {
      const prop = decl.slice(0, colon).trim()
      if (prop.startsWith('--')) {
        const dashEnd = prop.indexOf('-', 2)
        if (dashEnd !== -1) {
          const colorName = prop.slice(2, dashEnd)
          if (UNUSED_COLOR_SET.has(colorName) && UNUSED_COLOR_PROP_RE.test(prop)) {
            continue
          }
        }
      }
    }
    out.push(decl.endsWith(';') ? decl : `${decl};`)
  }
  return out.join('')
}

function isNestedRuleContainer(prelude: string): boolean {
  const trimmed = prelude.trimStart()
  return (
    trimmed.startsWith('@media') ||
    trimmed.startsWith('@supports') ||
    trimmed.startsWith('@layer') ||
    trimmed.startsWith('@container')
  )
}

function pruneStatementList(css: string): string {
  const out: string[] = []
  let i = 0
  const n = css.length

  while (i < n) {
    while (i < n && /\s/.test(css[i]!)) i += 1
    if (i >= n) break

    // Skip CSS comment
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? n : end + 2
      continue
    }

    const start = i
    let quote = ''
    let blockStart = -1
    let semiEnd = -1

    while (i < n) {
      const ch = css[i]!
      if (quote) {
        if (ch === '\\') {
          i += 2
          continue
        }
        if (ch === quote) quote = ''
        i += 1
        continue
      }
      if (ch === '/' && css[i + 1] === '*') {
        const end = css.indexOf('*/', i + 2)
        i = end === -1 ? n : end + 2
        continue
      }
      if (ch === '"' || ch === "'") {
        quote = ch
        i += 1
        continue
      }
      if (ch === '{') {
        blockStart = i
        break
      }
      if (ch === ';') {
        semiEnd = i
        break
      }
      i += 1
    }

    if (semiEnd !== -1) {
      const stmt = css.slice(start, semiEnd + 1).trim()
      if (stmt) out.push(stmt)
      i = semiEnd + 1
      continue
    }

    if (blockStart === -1) {
      const rest = css.slice(start).trim()
      if (rest) out.push(rest)
      break
    }

    const prelude = css.slice(start, blockStart).trim()

    // Find matching closing `}`
    let depth = 1
    let j = blockStart + 1
    quote = ''
    while (j < n && depth > 0) {
      const ch = css[j]!
      if (quote) {
        if (ch === '\\') {
          j += 2
          continue
        }
        if (ch === quote) quote = ''
        j += 1
        continue
      }
      if (ch === '/' && css[j + 1] === '*') {
        const end = css.indexOf('*/', j + 2)
        j = end === -1 ? n : end + 2
        continue
      }
      if (ch === '"' || ch === "'") {
        quote = ch
        j += 1
        continue
      }
      if (ch === '{') depth += 1
      else if (ch === '}') depth -= 1
      j += 1
    }

    const blockEnd = depth === 0 ? j - 1 : n
    const body = css.slice(blockStart + 1, blockEnd)
    i = depth === 0 ? j : n

    if (prelude.startsWith('@')) {
      if (shouldDropAtRule(prelude)) continue
      if (isNestedRuleContainer(prelude)) {
        const inner = pruneStatementList(body)
        if (!inner.trim()) continue
        out.push(`${prelude}{${inner}}`)
      } else {
        out.push(`${prelude}{${body}}`)
      }
      continue
    }

    if (shouldDropRulePrelude(prelude)) continue

    const hasNestedBraces = body.includes('{')
    if (hasNestedBraces) {
      // Keep mixed/nested rules (rare in Radix CSS) with declaration pruning avoided on nested blocks
      out.push(`${prelude}{${body}}`)
    } else {
      const prunedBody = pruneDeclarations(body)
      if (!prunedBody.trim()) continue
      out.push(`${prelude}{${prunedBody}}`)
    }
  }

  return out.join('\n')
}

export function pruneRadixThemesCss(css: string): string {
  return pruneStatementList(css)
}
