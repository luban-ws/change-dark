import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
  ROOT_ATTR,
} from '@change-dark/extension-settings'
import {
  buildRecolorOverrideStylesheet,
  collectRecolorOverrideRules,
  formatRecolorOverrideRule,
  prefixRecolorOverrideSelector,
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
      `color: var(${CSS_VAR_PAGE_FG}) !important`,
    )
  })
})

describe('prefixRecolorOverrideSelector', () => {
  it('普通选择器加 ROOT_ATTR 前缀', () => {
    expect(prefixRecolorOverrideSelector('body')).toBe(`html[${ROOT_ATTR}] body`)
    expect(prefixRecolorOverrideSelector('.gmp-page')).toBe(`html[${ROOT_ATTR}] .gmp-page`)
  })

  it(':root / :host 映射到 html[ROOT_ATTR]（非后代组合子）', () => {
    expect(prefixRecolorOverrideSelector(':root')).toBe(`html[${ROOT_ATTR}]`)
    expect(prefixRecolorOverrideSelector(':root, :host')).toBe(`html[${ROOT_ATTR}]`)
    expect(prefixRecolorOverrideSelector(':root, [data-theme="kumo"]')).toBe(
      `html[${ROOT_ATTR}], html[${ROOT_ATTR}][data-theme="kumo"]`,
    )
  })

  it('@keyframes 步骤选择器不加前缀', () => {
    expect(prefixRecolorOverrideSelector('0%')).toBe('0%')
    expect(prefixRecolorOverrideSelector('100%')).toBe('100%')
    expect(prefixRecolorOverrideSelector('from')).toBe('from')
  })
})

describe('RFC 031 S2 — 单张 <style> 全规则 golden in→out', () => {
  const input = readFixture('recolor-basic.input.css')

  it('collectRecolorOverrideRules 覆盖 body / header / @media / @keyframes', () => {
    const rules = collectRecolorOverrideRules(input)
    const flat = rules.map(formatRecolorOverrideRule).join('\n')
    expect(flat).toContain(`html[${ROOT_ATTR}] body {`)
    expect(flat).toContain(`html[${ROOT_ATTR}] .header {`)
    expect(flat).toContain('@media (min-width: 600px)')
    expect(flat).toContain('@keyframes pulse')
    expect(flat).not.toContain('margin')
  })

  it('golden 快照：整表 in→out（中性色绑 palette 变量）', () => {
    const out = buildRecolorOverrideStylesheet(input)
    const expected = [
      `html[${ROOT_ATTR}] body { color: var(${CSS_VAR_PAGE_FG}) !important; background-color: var(${CSS_VAR_PAGE_BG}) !important }`,
      `html[${ROOT_ATTR}] .header { border-color: var(${CSS_VAR_PAGE_BORDER}) !important }`,
      `@media (min-width: 600px) { html[${ROOT_ATTR}] .item { color: var(${CSS_VAR_PAGE_FG}) !important } }`,
      `@keyframes pulse { 0% { background-color: var(${CSS_VAR_PAGE_BG}) !important } }`,
      `@keyframes pulse { 100% { background-color: ${expectedHex('#000', 'bg')} !important } }`,
    ].join('\n\n')
    expect(out).toBe(expected)
  })

  it('空输入 → 空输出', () => {
    expect(buildRecolorOverrideStylesheet('')).toBe('')
    expect(buildRecolorOverrideStylesheet('/* only comment */')).toBe('')
  })

  it('Google Marketing Platform 常见 background 简写可改色', () => {
    const css = `
      body { background: rgb(255, 255, 255); color: rgb(65, 65, 65); }
      .gmp-page { background: rgb(255, 255, 255); }
      .secondary-hero__text-box { background: rgb(255, 255, 255); }
      .h-c-header__bar { background: rgb(255, 255, 255); }
    `
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(`html[${ROOT_ATTR}] body {`)
    expect(out).toContain(`html[${ROOT_ATTR}] .gmp-page {`)
    expect(out).toContain(`html[${ROOT_ATTR}] .secondary-hero__text-box {`)
    expect(out).toContain(`html[${ROOT_ATTR}] .h-c-header__bar {`)
    expect(out).not.toContain('rgb(255, 255, 255)')
    expect(out).toContain(`var(${CSS_VAR_PAGE_BG})`)
  })
})
