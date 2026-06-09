/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { parseCssColorToken } from '../color-parse'
import { STYLE_ELEMENT_ID } from '@luban-ws/extension-settings'
import { buildStaticDarkCss } from '@luban-ws/injected-styles'
import { modifyColor } from '../modify-colors'
import { buildRecolorOverrideStylesheet } from '../css-stylesheet'
import {
  analyzeRecolorMutations,
  applyRecolorMutationFlush,
  isExtensionInjectionElement,
} from '../recolor-mutation'
import { collectReadableStylesheetCssTexts } from '../stylesheet-collect'

function mockChildListMutation(added: Node[], removed: Node[] = []): MutationRecord {
  return {
    type: 'childList',
    target: document.documentElement,
    addedNodes: added as unknown as NodeList,
    removedNodes: removed as unknown as NodeList,
  } as MutationRecord
}

describe('isExtensionInjectionElement', () => {
  it('识别扩展注入 style 节点', () => {
    const el = document.createElement('style')
    el.id = STYLE_ELEMENT_ID
    expect(isExtensionInjectionElement(el)).toBe(true)
  })
})

describe('analyzeRecolorMutations', () => {
  it('新增同源 <style> → rebuildStylesheets', () => {
    const style = document.createElement('style')
    style.textContent = '.a { color: #000 }'
    document.head.appendChild(style)

    const plan = analyzeRecolorMutations([mockChildListMutation([style])])
    expect(plan.rebuildStylesheets).toBe(true)
  })

  it('忽略扩展注入 style 的 mutation', () => {
    const style = document.createElement('style')
    style.id = STYLE_ELEMENT_ID
    style.textContent = 'html {}'
    document.head.appendChild(style)

    const plan = analyzeRecolorMutations([mockChildListMutation([style])])
    expect(plan.rebuildStylesheets).toBe(false)
  })

  it('动态插入带内联 style 的元素 → inlineElements', () => {
    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    const plan = analyzeRecolorMutations([mockChildListMutation([p])])
    expect(plan.inlineElements).toContain(p)
  })
})

describe('RFC 031 P1-4 — applyRecolorMutationFlush', () => {
  const themeFilters = {
    brightness: 100,
    contrast: 100,
    sepia: 0,
    saturate: 100,
  } as const
  const budget = { maxNodes: 120, maxMs: 35 }

  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
  })

  it('动态插入 stylesheet 后 flush 更新覆盖层', () => {
    const style = document.createElement('style')
    style.textContent = '.dyn { color: #000; }'
    document.head.appendChild(style)

    const plan = analyzeRecolorMutations([mockChildListMutation([style])])
    const result = applyRecolorMutationFlush(document, plan, themeFilters, budget)
    expect(result.stylesheetRebuilt).toBe(true)

    const injected = document.getElementById(STYLE_ELEMENT_ID)
    const source = collectReadableStylesheetCssTexts(document).cssChunks.join('\n\n')
    const expected = buildRecolorOverrideStylesheet(source)
    expect(injected?.textContent).toContain(expected.split('\n\n')[0]!)
  })

  it('flush 重建 stylesheet 时合并采样铺底 CSS', () => {
    const baseCss = buildStaticDarkCss('rgb(10, 12, 14)', 'rgb(230, 230, 235)')
    const style = document.createElement('style')
    style.textContent = 'body { background: rgb(255, 255, 255); }'
    document.head.appendChild(style)

    const plan = analyzeRecolorMutations([mockChildListMutation([style])])
    applyRecolorMutationFlush(document, plan, themeFilters, budget, undefined, baseCss)

    const injected = document.getElementById(STYLE_ELEMENT_ID)
    expect(injected?.textContent).toContain('rgb(10, 12, 14)')
    expect(injected?.textContent).toContain('background:')
  })

  it('动态插入内联 style 后 flush 改色', () => {
    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    const plan = analyzeRecolorMutations([mockChildListMutation([p])])
    const result = applyRecolorMutationFlush(document, plan, themeFilters, budget)
    expect(result.inlineElementsRecolored).toBe(1)
    expect(parseCssColorToken(p.style.getPropertyValue('color'))).toEqual(
      modifyColor({ r: 0, g: 0, b: 0 }, 'fg'),
    )
  })
})
