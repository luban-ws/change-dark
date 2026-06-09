import { describe, expect, it } from 'vitest'

import {
  getRecolorSkipReason,
  isRecolorUnsupportedColorValue,
  RECOLOR_KNOWN_LIMITATIONS,
  RECOLOR_SKIP_REASON,
} from '../recolor-known-limitations'
import { parseCssColorToken } from '../color-parse'
import { buildRecolorOverrideStylesheet } from '../css-stylesheet'

describe('RFC 031 P1-6 — CSS 变量已知限制', () => {
  it('已知限制表含 var() 与跨域 sheet', () => {
    const ids = RECOLOR_KNOWN_LIMITATIONS.map((x) => x.id)
    expect(ids).toContain(RECOLOR_SKIP_REASON.CSS_VAR)
    expect(ids).toContain('cross-origin-stylesheet')
  })

  it('var() 返回 css-var 跳过原因', () => {
    expect(getRecolorSkipReason('var(--text)')).toBe(RECOLOR_SKIP_REASON.CSS_VAR)
    expect(getRecolorSkipReason('var( --primary , #fff )')).toBe(
      RECOLOR_SKIP_REASON.CSS_VAR,
    )
    expect(isRecolorUnsupportedColorValue('var(--bg)')).toBe(true)
  })

  it('parseCssColorToken 跳过 var()', () => {
    expect(parseCssColorToken('var(--text)')).toBeNull()
  })

  it('stylesheet 中 var() 规则不出现在覆盖层', () => {
    const css = `
      :root { --text: #000; }
      body { color: var(--text); background-color: #fff; }
    `
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).not.toContain('var(--text)')
    expect(out).toContain('background-color:')
  })
})
