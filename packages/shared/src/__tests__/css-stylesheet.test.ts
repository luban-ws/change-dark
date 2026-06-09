import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  buildRecolorOverrideStylesheet,
  collectRecolorOverrideRules,
  formatRecolorOverrideRule,
  recolorDeclarationBlock,
} from '../css-stylesheet'
import { formatRgbHex, parseCssColorToken } from '../color-parse'
import { modifyColor } from '../modify-colors'

const fixtureDir = dirname(fileURLToPath(import.meta.url))

function readFixture(name: string): string {
  return readFileSync(join(fixtureDir, 'fixtures', name), 'utf8')
}

/** golden 预期：与 modifyColor 同源推导，避免手算漂移。 */
function expectedHex(input: string, use: 'bg' | 'fg' | 'border'): string {
  const rgb = parseCssColorToken(input)
  if (!rgb) throw new Error(`bad fixture color ${input}`)
  return formatRgbHex(modifyColor(rgb, use))
}

describe('recolorDeclarationBlock', () => {
  it('只输出改色 longhand 且带 !important', () => {
    expect(recolorDeclarationBlock('color: #000; margin: 0')).toBe(
      `color: ${expectedHex('#000', 'fg')} !important`,
    )
  })
})

describe('RFC 031 S2 — 单张 <style> 全规则 golden in→out', () => {
  const input = readFixture('recolor-basic.input.css')

  it('collectRecolorOverrideRules 覆盖 body / header / @media / @keyframes', () => {
    const rules = collectRecolorOverrideRules(input)
    const flat = rules.map(formatRecolorOverrideRule).join('\n')
    expect(flat).toContain('body {')
    expect(flat).toContain('.header {')
    expect(flat).toContain('@media (min-width: 600px)')
    expect(flat).toContain('@keyframes pulse')
    expect(flat).not.toContain('margin')
  })

  it('golden 快照：整表 in→out', () => {
    const out = buildRecolorOverrideStylesheet(input)
    const expected = [
      `body { color: ${expectedHex('#000', 'fg')} !important; background-color: ${expectedHex('#fff', 'bg')} !important }`,
      `.header { border-color: ${expectedHex('#ccc', 'border')} !important }`,
      `@media (min-width: 600px) { .item { color: ${expectedHex('#333', 'fg')} !important } }`,
      `@keyframes pulse { 0% { background-color: ${expectedHex('#fff', 'bg')} !important } }`,
      `@keyframes pulse { 100% { background-color: ${expectedHex('#000', 'bg')} !important } }`,
    ].join('\n\n')
    expect(out).toBe(expected)
  })

  it('空输入 → 空输出', () => {
    expect(buildRecolorOverrideStylesheet('')).toBe('')
    expect(buildRecolorOverrideStylesheet('/* only comment */')).toBe('')
  })
})
