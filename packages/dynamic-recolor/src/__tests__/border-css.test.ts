/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  ROOT_ATTR,
} from '@change-dark/extension-settings'
import { buildRecolorOverrideStylesheet } from '../css-stylesheet'

describe('border shorthand recolor', () => {
  it('gmp-page 左右白边 border 简写可改色', () => {
    const css = `
      @media (min-width: 1441px) {
        .gmp-page {
          border-left: 24px solid #fff;
          border-right: 24px solid #fff;
          max-width: 1440px;
        }
      }
    `
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(`border-left: 24px solid var(${CSS_VAR_PAGE_BG})`)
    expect(out).toContain(`border-right: 24px solid var(${CSS_VAR_PAGE_BG})`)
    expect(out).toContain(`html[${ROOT_ATTR}] .gmp-page {`)
    expect(out).not.toMatch(/#fff\b/i)
  })

  it('细边框简写 → page-border', () => {
    const css = `.card { border: 1px solid #fff; }`
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(`border: 1px solid var(${CSS_VAR_PAGE_BORDER})`)
  })

  it('footer 浅灰底 background 简写可改色', () => {
    const css = `.h-c-footer { background: #f8f9fa; margin: 0; }`
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(`html[${ROOT_ATTR}] .h-c-footer {`)
    expect(out).not.toContain('#f8f9fa')
  })
})
