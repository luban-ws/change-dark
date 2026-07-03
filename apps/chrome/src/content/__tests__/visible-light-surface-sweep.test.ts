/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'

import { sweepVisibleLightSurfaces } from '../visible-light-surface-sweep'
import { SURFACE_FLOOR_ATTR } from '../light-surface-utils'
import { resetActiveSitePolicyForTests } from '../site-policy'

function mockRect(el: HTMLElement, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

/** 模拟浏览器 computed 黑底；不 spread CSSStyleDeclaration（跨 jsdom 版本不稳定）。 */
function stubComputedBackgroundBlack(): void {
  vi.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
    const el = target as HTMLElement
    const readInline = (): string =>
      el.style.getPropertyValue('background-color').trim() ||
      el.style.backgroundColor?.trim() ||
      ''

    return {
      backgroundColor: readInline() || 'rgb(0, 0, 0)',
      backgroundImage: 'none',
      getPropertyValue: (prop: string) => {
        if (prop === 'background-color') return readInline() || 'rgb(0, 0, 0)'
        if (prop === 'background-image') return 'none'
        return ''
      },
    } as CSSStyleDeclaration
  })
}

describe('sweepVisibleLightSurfaces', () => {
  const budget = { maxNodes: 80, maxMs: 35 }

  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.cssText = ''
    resetActiveSitePolicyForTests()
    vi.restoreAllMocks()
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 800,
    })
  })

  it('铺地标 footer 与大面积 section，不铺透明 grid', () => {
    stubComputedBackgroundBlack()

    const footer = document.createElement('footer')
    footer.className = 'h-c-footer'
    footer.style.setProperty('background-color', 'rgb(248, 249, 250)')
    mockRect(footer, 800, 200)
    document.body.appendChild(footer)

    const section = document.createElement('section')
    section.style.setProperty('background-color', 'rgb(255, 255, 255)')
    mockRect(section, 600, 400)
    document.body.appendChild(section)

    const grid = document.createElement('div')
    grid.className = 'h-c-page'
    grid.style.setProperty('background', 'transparent')
    grid.style.width = '600px'
    grid.style.height = '400px'
    mockRect(grid, 600, 400)
    document.body.appendChild(grid)

    const count = sweepVisibleLightSurfaces(document, budget)
    expect(count).toBeGreaterThan(0)
    expect(footer.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(true)
    expect(section.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(true)
    expect(grid.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(false)
  })
})
