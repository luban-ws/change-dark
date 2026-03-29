import { describe, expect, it, vi } from 'vitest'

import { FILTER_PLUS_SVG_FILTER_ID, FILTER_PLUS_SVG_HOST_ID } from './constants'
import { buildFilterPlusCss, shouldExposeFilterPlusMode } from './filter-plus-svg'

describe('RFC 014 — buildFilterPlusCss', () => {
  it('根节点使用 url(#id)；媒体再引用同 id；排除滤镜宿主 SVG', () => {
    const sheet = buildFilterPlusCss()
    expect(sheet).toContain(`url(#${FILTER_PLUS_SVG_FILTER_ID})`)
    expect(sheet).toContain(`svg:not(#${FILTER_PLUS_SVG_HOST_ID})`)
  })

  it('非中性 RFC 011 接在 url() 之后', () => {
    const sheet = buildFilterPlusCss({
      brightness: 100,
      contrast: 100,
      sepia: 0,
      saturate: 80,
    })
    expect(sheet).toContain(`url(#${FILTER_PLUS_SVG_FILTER_ID})`)
    expect(sheet).toContain('saturate(80%)')
  })
})

describe('shouldExposeFilterPlusMode', () => {
  it('Firefox UA 下为 false', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Firefox/120' })
    expect(shouldExposeFilterPlusMode()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('Chrome UA 下为 true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
    })
    expect(shouldExposeFilterPlusMode()).toBe(true)
    vi.unstubAllGlobals()
  })
})
