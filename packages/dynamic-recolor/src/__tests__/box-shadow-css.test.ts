/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { ROOT_ATTR } from '@change-dark/extension-settings'
import { buildRecolorOverrideStylesheet } from '../css-stylesheet'

describe('box-shadow recolor', () => {
  it('改写 box-shadow 内嵌浅色', () => {
    const css = `.card { box-shadow: 0 2px 8px rgba(255, 255, 255, 0.9); }`
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(`html[${ROOT_ATTR}] .card {`)
    expect(out).not.toContain('255, 255, 255')
  })
})
