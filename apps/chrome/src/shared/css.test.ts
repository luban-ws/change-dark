import { describe, expect, it } from 'vitest'

import { CSS_VAR_PAGE_BG, CSS_VAR_PAGE_FG, FILTER_CSS_INVERT_CHAIN } from './constants'
import { buildDarkCss, buildFilterInvertCss, buildStaticDarkCss } from './css'

describe('buildDarkCss', () => {
  it('包含传入的背景与前景色', () => {
    const sheet = buildDarkCss('rgb(10, 12, 14)', 'rgb(230, 230, 235)')
    expect(sheet).toContain('rgb(10, 12, 14)')
    expect(sheet).toContain('rgb(230, 230, 235)')
    expect(sheet).toContain('color-scheme: dark')
    expect(sheet).toContain('--cd-scrollbar-thumb')
    expect(sheet).toContain('scrollbar-width: thin')
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

describe('buildFilterInvertCss（RFC 013）', () => {
  it('根节点含反相链；媒体选择器含再反相', () => {
    const sheet = buildFilterInvertCss()
    expect(sheet).toContain(`filter: ${FILTER_CSS_INVERT_CHAIN} !important`)
    expect(sheet).toContain('html[data-change-dark-root] img')
    expect(sheet).toContain('video')
    expect(sheet).toContain('canvas')
  })

  it('非中性 RFC 011 链接在反相链之后', () => {
    const sheet = buildFilterInvertCss({
      brightness: 100,
      contrast: 100,
      sepia: 0,
      saturate: 50,
    })
    expect(sheet).toContain(FILTER_CSS_INVERT_CHAIN)
    expect(sheet).toContain('saturate(50%)')
    const iInv = sheet.indexOf(FILTER_CSS_INVERT_CHAIN)
    const iSat = sheet.indexOf('saturate(50%)')
    expect(iInv).toBeGreaterThanOrEqual(0)
    expect(iSat).toBeGreaterThan(iInv)
  })
})

describe('buildStaticDarkCss（RFC 015）', () => {
  it('包含 buildDarkCss 基底与 :where 排版色', () => {
    const sheet = buildStaticDarkCss('rgb(1, 2, 3)', 'rgb(200, 200, 210)')
    expect(sheet).toContain('rgb(1, 2, 3)')
    expect(sheet).toContain(`var(${CSS_VAR_PAGE_FG})`)
    expect(sheet).toContain(':where(main, article')
    expect(sheet).toContain('span')
    expect(sheet).toContain('html[data-change-dark-root]')
  })

  it('为语义块级容器注入与字色一致的背景变量，避免浅字叠白底', () => {
    const sheet = buildStaticDarkCss('rgb(10, 12, 14)', 'rgb(230, 230, 235)')
    expect(sheet).toContain(`var(${CSS_VAR_PAGE_BG})`)
    expect(sheet).toContain('background-color:')
    expect(sheet).toContain(':where(main, article, aside, section, nav, header, footer, [role="main"])')
  })
})
