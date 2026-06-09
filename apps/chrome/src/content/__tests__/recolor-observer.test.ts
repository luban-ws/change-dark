/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import {
  INLINE_STYLE_BACKUP_ATTR,
  ROOT_ATTR,
  STYLE_ELEMENT_ID,
  buildRecolorOverrideStylesheet,
  modifyColor,
  parseCssColorToken,
} from '@luban-ws/dark-shared'

import { paintRecolorPath } from '../recolor-path'
import {
  __setRecolorObserverIdleScheduleForTests,
  flushRecolorDynamicObserverRafForTests,
  startRecolorDynamicObserver,
  stopRecolorDynamicObserver,
} from '../recolor-observer'
import { scheduleIdleTask } from '../sampling'

const themeFilters = {
  brightness: 100,
  contrast: 100,
  sepia: 0,
  saturate: 100,
} as const

const budget = { maxNodes: 120, maxMs: 35 }

describe('RFC 031 P1-4 — MutationObserver 动态补色', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.documentElement.removeAttribute(ROOT_ATTR)
    document.getElementById(STYLE_ELEMENT_ID)?.remove()
    __setRecolorObserverIdleScheduleForTests((task) => task())
  })

  afterEach(() => {
    stopRecolorDynamicObserver()
    __setRecolorObserverIdleScheduleForTests(scheduleIdleTask)
  })

  it('动态插入 <style> 后 observer 更新覆盖 CSS', async () => {
    const seed = document.createElement('style')
    seed.textContent = 'body { color: #000; background-color: #fff; }'
    document.head.appendChild(seed)
    expect(paintRecolorPath(themeFilters, 'dark')).toBe(true)

    startRecolorDynamicObserver(themeFilters, budget, 'dark')

    const style = document.createElement('style')
    style.textContent = '.late { color: #000; }'
    document.head.appendChild(style)

    await Promise.resolve()
    flushRecolorDynamicObserverRafForTests()

    const injected = document.getElementById(STYLE_ELEMENT_ID)
    const lateOverride = buildRecolorOverrideStylesheet('.late { color: #000; }')
    expect(injected?.textContent).toContain(lateOverride.trim())
  })

  it('动态插入内联 style 元素后 observer 改色', async () => {
    const seed = document.createElement('style')
    seed.textContent = 'body { color: #000; background-color: #fff; }'
    document.head.appendChild(seed)
    paintRecolorPath(themeFilters, 'dark')
    startRecolorDynamicObserver(themeFilters, budget, 'dark')

    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    await Promise.resolve()
    flushRecolorDynamicObserverRafForTests()

    expect(p.getAttribute(INLINE_STYLE_BACKUP_ATTR)).toBe('color:#000')
    expect(parseCssColorToken(p.style.getPropertyValue('color'))).toEqual(
      modifyColor({ r: 0, g: 0, b: 0 }, 'fg'),
    )
  })
})
