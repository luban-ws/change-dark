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

/** Linux CI jsdom：computed 常为 rgb(0,0,0)，须保留真实 getComputedStyle 供其它字段。 */
function stubEmptyComputedBackground(): void {
  const real = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
    const base = real(target as Element)
    return {
      ...base,
      backgroundColor: 'rgb(0, 0, 0)',
      backgroundImage: 'none',
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
    stubEmptyComputedBackground()

    const footer = document.createElement('footer')
    footer.className = 'h-c-footer'
    footer.style.backgroundColor = 'rgb(248, 249, 250)'
    mockRect(footer, 800, 200)
    document.body.appendChild(footer)

    const section = document.createElement('section')
    section.style.backgroundColor = 'rgb(255, 255, 255)'
    mockRect(section, 600, 400)
    document.body.appendChild(section)

    const grid = document.createElement('div')
    grid.className = 'h-c-page'
    grid.style.background = 'transparent'
    grid.style.width = '600px'
    grid.style.height = '400px'
    document.body.appendChild(grid)

    const count = sweepVisibleLightSurfaces(document, budget)
    expect(count).toBeGreaterThan(0)
    expect(footer.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(true)
    expect(section.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(true)
    expect(grid.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(false)
  })
})
