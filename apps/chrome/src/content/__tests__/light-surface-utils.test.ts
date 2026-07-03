/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { DEFAULT_SURFACE_REPAIR_POLICY } from '@change-dark/site-catalog'

import {
  hasOpaqueLightFill,
  shouldPaintOpaqueLightSurface,
  SURFACE_FLOOR_ATTR,
} from '../light-surface-utils'

function fakeComputedStyle(
  backgroundColor = 'rgb(0, 0, 0)',
  backgroundImage = 'none',
): CSSStyleDeclaration {
  return { backgroundColor, backgroundImage } as CSSStyleDeclaration
}

describe('light-surface-utils', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shouldPaintOpaqueLightSurface：inline 浅底优先于 computed 黑底', () => {
    const footer = document.createElement('footer')
    footer.style.setProperty('background-color', 'rgb(248, 249, 250)')
    document.body.appendChild(footer)

    const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
    styleCache.set(footer, fakeComputedStyle())

    expect(hasOpaqueLightFill(footer, styleCache)).toBe(true)
    expect(shouldPaintOpaqueLightSurface(footer, DEFAULT_SURFACE_REPAIR_POLICY, styleCache)).toBe(
      true,
    )
  })

  it('shouldPaintOpaqueLightSurface：透明 layout 不铺', () => {
    const grid = document.createElement('div')
    grid.className = 'h-c-page'
    grid.style.setProperty('background', 'transparent')
    document.body.appendChild(grid)

    const styleCache = new Map<HTMLElement, CSSStyleDeclaration>()
    styleCache.set(grid, fakeComputedStyle())

    expect(shouldPaintOpaqueLightSurface(grid, DEFAULT_SURFACE_REPAIR_POLICY, styleCache)).toBe(
      false,
    )
    expect(grid.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(false)
  })
})
