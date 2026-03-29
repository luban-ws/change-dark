import { describe, expect, it } from 'vitest'

import { buildDarkCss } from './css'

describe('buildDarkCss', () => {
  it('包含传入的背景与前景色', () => {
    const sheet = buildDarkCss('rgb(10, 12, 14)', 'rgb(230, 230, 235)')
    expect(sheet).toContain('rgb(10, 12, 14)')
    expect(sheet).toContain('rgb(230, 230, 235)')
    expect(sheet).toContain('color-scheme: dark')
  })

  it('非中性滤镜时注入 filter', () => {
    const sheet = buildDarkCss('rgb(1, 2, 3)', 'rgb(4, 5, 6)', {
      brightness: 100,
      contrast: 100,
      sepia: 0,
      saturate: 50,
    })
    expect(sheet).toContain('filter:')
    expect(sheet).toContain('saturate(50%)')
  })
})
