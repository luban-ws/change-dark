import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { ROOT_ATTR } from '@change-dark/extension-settings'
import { buildRecolorOverrideStylesheet } from '../css-stylesheet'

const GMP_CSS_PATH = '/tmp/gmp.css'

describe('Google Marketing Platform index.min.css recolor', () => {
  it('改色 body / gmp-page / hero text-box / header bar', () => {
    let css: string
    try {
      css = readFileSync(GMP_CSS_PATH, 'utf8')
    } catch {
      // CI 无 curl 产物时跳过
      return
    }
    const out = buildRecolorOverrideStylesheet(css)
    expect(out.length).toBeGreaterThan(1000)
    expect(out).toContain(`html[${ROOT_ATTR}] body {`)
    expect(out).toContain(`html[${ROOT_ATTR}] .gmp-page {`)
    expect(out).toContain(`html[${ROOT_ATTR}] .secondary-hero__text-box {`)
    expect(out).toContain(`html[${ROOT_ATTR}] .h-c-header__bar {`)
    expect(out).toMatch(/border-left:\s*24px\s+solid/i)
    expect(out).toContain(`html[${ROOT_ATTR}] .h-c-footer {`)
    expect(out).not.toMatch(/#fff\b/i)
    expect(out).not.toContain('rgb(255, 255, 255)')
  })
})
