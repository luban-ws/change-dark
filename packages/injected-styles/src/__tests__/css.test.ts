import { describe, expect, it } from 'vitest'

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
  ROOT_ATTR,
  STYLE_ELEMENT_CUSTOM_CSS_ID,
  STYLE_ELEMENT_ID,
} from '@change-dark/extension-settings'
import {
  buildDarkCss,
  buildRecolorDynamicCss,
  buildRecolorShellCss,
  buildStaticDarkCss,
  buildThemePaletteShellCss,
  ensureCustomCssStyleElement,
  ensureStyleElement,
} from '../css'

describe('buildDarkCss', () => {
  it('包含传入的背景与前景色', () => {
    const sheet = buildDarkCss('rgb(10, 12, 14)', 'rgb(230, 230, 235)')
    expect(sheet).toContain('rgb(10, 12, 14)')
    expect(sheet).toContain('rgb(230, 230, 235)')
    expect(sheet).toContain('background-color: rgb(10, 12, 14) !important')
    expect(sheet).toContain('color-scheme: dark')
    expect(sheet).toContain('--cd-scrollbar-thumb')
    expect(sheet).toContain('scrollbar-width: thin')
  })

  it('包含 page-border 分隔色变量', () => {
    const sheet = buildDarkCss('rgb(0, 43, 54)', 'rgb(147, 161, 161)')
    expect(sheet).toContain('--cd-page-border')
    expect(sheet).toContain('color-mix(in srgb, var(--cd-page-bg) 68%, black)')
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

  it('仅为 main 注入 page-bg，不铺透明 layout 选择器', () => {
    const sheet = buildStaticDarkCss('rgb(10, 12, 14)', 'rgb(230, 230, 235)')
    expect(sheet).toContain(`var(${CSS_VAR_PAGE_BG})`)
    expect(sheet).toContain('background-color:')
    expect(sheet).toContain(':where(main, [role="main"])')
    expect(sheet).not.toContain('[class*="h-c-grid"]')
    expect(sheet).not.toContain('[class*="h-c-page"]')
  })
})

describe('ensureStyleElement', () => {
  it('更新时将 style 节点移到 head 末尾', () => {
    document.head.innerHTML = ''
    const first = document.createElement('style')
    first.id = 'site-first'
    document.head.appendChild(first)

    ensureStyleElement('html {}')
    const injected = document.getElementById(STYLE_ELEMENT_ID)
    expect(injected).not.toBeNull()
    expect(document.head.lastElementChild?.id).toBe(STYLE_ELEMENT_ID)

    ensureStyleElement('html { color: red; }')
    expect(document.head.lastElementChild?.id).toBe(STYLE_ELEMENT_ID)
  })

  it('MO 重建主样式后 catalog customCss 仍 pinned 在 head 末尾', () => {
    document.head.innerHTML = ''
    ensureStyleElement('html {}')
    ensureCustomCssStyleElement('body { background-color: var(--cd-page-bg) !important; }')
    ensureStyleElement('html[data-change-dark-root] body { background-color: rgb(24, 26, 27) !important; }')
    expect(document.head.lastElementChild?.id).toBe(STYLE_ELEMENT_CUSTOM_CSS_ID)
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

describe('buildThemePaletteShellCss（RFC 032 引擎主题壳）', () => {
  it('强制 html/body/main/header 与组件壳使用 palette 变量（无 :where）', () => {
    const shell = buildThemePaletteShellCss()
    expect(shell).toContain(`var(${CSS_VAR_PAGE_BG})`)
    expect(shell).toContain(`var(${CSS_VAR_PAGE_FG})`)
    expect(shell).toContain('html[data-change-dark-root] body')
    expect(shell).toContain('html[data-change-dark-root] main')
    expect(shell).toContain('html[data-change-dark-root] header')
    expect(shell).toContain('[class*="__bar"]')
    expect(shell).not.toContain(':where(')
    expect(shell).toContain('h-is-active')
    expect(shell).toContain('color-mix')
    expect(shell).toContain('bg-kumo-base')
    expect(shell).toContain(CSS_VAR_PAGE_BORDER)
    expect(shell).toContain('ring-kumo')
  })
})
