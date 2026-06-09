import { describe, expect, it } from 'vitest'

import { CSS_VAR_PAGE_BG, CSS_VAR_PAGE_FG, ROOT_ATTR } from '@luban-ws/extension-settings'
import {
  buildDarkCss,
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

describe('buildStaticDarkCss（RFC 015 回退）', () => {
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
    expect(shell).not.toMatch(/html\[[^\]]+\]\s*\{[^}]*filter:/)
  })

  it('非中性主题滤镜挂在 body 而非 html', () => {
    const shell = buildRecolorShellCss({
      brightness: 90,
      contrast: 100,
      sepia: 0,
      saturate: 100,
    })
    expect(shell).toContain(`html[${ROOT_ATTR}] body`)
    expect(shell).toContain('brightness(90%)')
  })

  it('buildRecolorDynamicCss 含媒体保护与覆盖规则', () => {
    const out = buildRecolorDynamicCss('body { color: #eee !important; }')
    expect(out).toContain('color-scheme: dark')
    expect(out).toContain('img')
    expect(out).toContain('filter: none !important')
    expect(out).toContain('body { color: #eee !important; }')
  })
})
