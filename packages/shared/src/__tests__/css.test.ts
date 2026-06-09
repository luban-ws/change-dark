import { describe, expect, it } from 'vitest'

import { CSS_VAR_PAGE_BG, CSS_VAR_PAGE_FG, FILTER_CSS_INVERT_CHAIN, ROOT_ATTR } from '../constants'
import { PAGE_PALETTE_SOLARIZED_DARK, SOLARIZED_PAGE_BG_CSS } from '../page-palette'
import {
  buildDarkCss,
  buildFilterInvertCss,
  buildFilterInvertMediaSelectorList,
  buildRecolorDynamicCss,
  buildRecolorShellCss,
  buildStaticDarkCss,
} from '../css'

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

describe('buildFilterInvertMediaSelectorList（RFC 013）', () => {
  it('picture 与 svg 限定子句位于 video 之前；含 audio 与 [role=img]', () => {
    const htmlRoot = `html[${ROOT_ATTR}]`
    const list = buildFilterInvertMediaSelectorList(htmlRoot, 'svg:not(#cd-host)')
    expect(list).toContain(`${htmlRoot} audio`)
    expect(list).toContain(`${htmlRoot} svg:not(#cd-host)`)
    expect(list).toContain(`${htmlRoot} [role="img"]`)
    expect(list.indexOf('picture')).toBeLessThan(list.indexOf('svg:not'))
    expect(list.indexOf('svg:not')).toBeLessThan(list.indexOf('video'))
  })
})

describe('buildFilterInvertCss（RFC 013）', () => {
  it('根节点含反相链；媒体选择器含再反相', () => {
    const sheet = buildFilterInvertCss()
    expect(sheet).toContain(`filter: ${FILTER_CSS_INVERT_CHAIN} !important`)
    expect(sheet).toContain('html[data-change-dark-root] img')
    expect(sheet).toContain('video')
    expect(sheet).toContain('audio')
    expect(sheet).toContain('canvas')
    expect(sheet).toContain('object')
    expect(sheet).toContain('embed')
    expect(sheet).toContain('iframe')
    expect(sheet).toContain('[role="img"]')
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

  it('Solarized 页面调色板：html 铺壳色、反相在 body、媒体前缀含 body', () => {
    const sheet = buildFilterInvertCss(undefined, PAGE_PALETTE_SOLARIZED_DARK)
    expect(sheet).toContain(SOLARIZED_PAGE_BG_CSS)
    expect(sheet).toContain('html[data-change-dark-root] body {')
    expect(sheet).toContain('html[data-change-dark-root] body img')
    expect(sheet).toContain('html[data-change-dark-root] body iframe')
    const beforeBodyRule = sheet.split('html[data-change-dark-root] body')[0] ?? ''
    expect(beforeBodyRule).not.toContain('filter:')
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

describe('buildRecolorShellCss / buildRecolorDynamicCss (RFC 031 S3)', () => {
  it('壳层含 color-scheme，无全局 pageBg 铺色', () => {
    const shell = buildRecolorShellCss()
    expect(shell).toContain(`html[${ROOT_ATTR}]`)
    expect(shell).toContain('color-scheme: dark')
    expect(shell).not.toContain(CSS_VAR_PAGE_BG)
  })

  it('buildRecolorDynamicCss 拼接覆盖规则', () => {
    const out = buildRecolorDynamicCss('body { color: #eee !important; }')
    expect(out).toContain('color-scheme: dark')
    expect(out).toContain('body { color: #eee !important; }')
  })
})
