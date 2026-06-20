import { describe, expect, it, beforeEach } from 'vitest'

import {
  INLINE_STYLE_BACKUP_ATTR,
  ROOT_ATTR,
  STYLE_ELEMENT_ID,
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_FG,
} from '@change-dark/extension-settings'
import {
  buildRecolorOverrideStylesheet,
  collectReadableStylesheetCssTexts,
  resolveThemePalette,
} from '@change-dark/dynamic-recolor'
import { paintRecolorPath, paintRecolorStylesheetPath } from '../recolor-path'

const themeFilters = {
  brightness: 100,
  contrast: 100,
  sepia: 0,
  saturate: 100,
} as const

const darkTheme = resolveThemePalette('dark', 'rgb(24, 26, 27)', 'rgb(232, 230, 227)')
const solarizedTheme = resolveThemePalette(
  'solarized-dark',
  'rgb(0, 43, 54)',
  'rgb(147, 161, 161)',
)

describe('RFC 031 S3 — 整页 styleSheets + 注入覆盖', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.documentElement.removeAttribute(ROOT_ATTR)
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
  })

  it('collectReadableStylesheetCssTexts 读取同源 <style>', () => {
    const style = document.createElement('style')
    style.textContent = 'body { color: #000; background-color: #fff; }'
    document.head.appendChild(style)

    const { cssChunks, readableSheetCount } = collectReadableStylesheetCssTexts(document)
    expect(readableSheetCount).toBeGreaterThan(0)
    expect(cssChunks.join('\n')).toContain('body')
  })

  it('paintRecolorPath 注入改色覆盖 + ROOT_ATTR', () => {
    const style = document.createElement('style')
    style.textContent = `
      body { color: #000; background-color: #fff; }
      .card { border-color: #ccc; }
    `
    document.head.appendChild(style)

    const ok = paintRecolorPath(themeFilters, darkTheme)
    expect(ok).toBe(true)
    expect(document.documentElement.getAttribute(ROOT_ATTR)).toBe('')

    const el = document.getElementById(STYLE_ELEMENT_ID)
    expect(el?.textContent).toContain('color-scheme: dark')
    expect(el?.textContent).toContain('!important')

    const source = collectReadableStylesheetCssTexts(document).cssChunks.join('\n\n')
    const expectedOverride = buildRecolorOverrideStylesheet(source)
    expect(el?.textContent).toContain(expectedOverride.split('\n\n')[0]!)
  })

  it('无可读 stylesheet 且无内联颜色时 paintRecolorPath 返回 false', () => {
    expect(paintRecolorPath(themeFilters, darkTheme)).toBe(false)
  })

  it('RFC 031 P1-3 — 内联 style 在同源 stylesheet 存在时一并改色', () => {
    const style = document.createElement('style')
    style.textContent = 'body { background-color: #fff; }'
    document.head.appendChild(style)

    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    const ok = paintRecolorPath(themeFilters, darkTheme)
    expect(ok).toBe(true)
    expect(document.documentElement.getAttribute(ROOT_ATTR)).toBe('')
    expect(p.getAttribute(INLINE_STYLE_BACKUP_ATTR)).toBe('color:#000')
    expect(p.style.getPropertyValue('color').trim()).toBe(
      `var(${CSS_VAR_PAGE_FG})`,
    )
  })

  it('Solarized — stylesheet 改色使用 solarized profile', () => {
    const style = document.createElement('style')
    style.textContent = `
      body { background-color: #fff; }
      .secondary-hero__text-box { background-color: #fff; color: #000; }
    `
    document.head.appendChild(style)

    const baseCss = `:root { ${CSS_VAR_PAGE_BG}: rgb(0, 43, 54); ${CSS_VAR_PAGE_FG}: rgb(147, 161, 161); }`
    const ok = paintRecolorStylesheetPath(themeFilters, solarizedTheme, document, baseCss)
    expect(ok).toBe(true)
    const el = document.getElementById(STYLE_ELEMENT_ID)
    expect(el?.textContent).toContain('secondary-hero__text-box')
    expect(el?.textContent).not.toContain('rgb(255, 255, 255)')
    expect(el?.textContent).toContain(CSS_VAR_PAGE_BG)
  })

  it('RFC 032 — baseCss 与 recolor 层合并注入，不覆盖铺底变量', () => {
    const style = document.createElement('style')
    style.textContent = 'body { color: #000; background-color: #fff; }'
    document.head.appendChild(style)

    const baseCss = `:root { ${CSS_VAR_PAGE_BG}: rgb(24, 26, 27); }`
    const ok = paintRecolorPath(themeFilters, darkTheme, document, baseCss)
    expect(ok).toBe(true)
    const el = document.getElementById(STYLE_ELEMENT_ID)
    expect(el?.textContent).toContain(CSS_VAR_PAGE_BG)
    expect(el?.textContent).toContain('color-scheme: dark')
  })

  it('无可读 stylesheet 时返回 false，且不提前改写内联 style', () => {
    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    const ok = paintRecolorPath(themeFilters, darkTheme)
    expect(ok).toBe(false)
    expect(p.getAttribute(INLINE_STYLE_BACKUP_ATTR)).toBeNull()
    expect(p.style.getPropertyValue('color')).toBe('rgb(0, 0, 0)')
  })
})
