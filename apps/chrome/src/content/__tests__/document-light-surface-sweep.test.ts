/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { THEME_PAGE_BACKGROUND_CSS } from '@change-dark/extension-settings'
import { sweepDocumentLightSurfaces } from '../document-light-surface-sweep'
import {
  parseBackgroundAlpha,
  shouldPaintOpaqueLightSurface,
  SURFACE_FLOOR_ATTR,
} from '../light-surface-utils'
import { resetActiveSitePolicyForTests } from '../site-policy'

function mockRect(el: HTMLElement, width: number, height: number, top = 0, left = 0): void {
  el.getBoundingClientRect = () =>
    ({
      width,
      height,
      top,
      left,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect
}

describe('parseBackgroundAlpha', () => {
  it('识别 transparent / rgba alpha', () => {
    expect(parseBackgroundAlpha('transparent')).toBe(0)
    expect(parseBackgroundAlpha('rgba(0, 0, 0, 0)')).toBe(0)
    expect(parseBackgroundAlpha('rgba(255, 255, 255, 0.9)')).toBeCloseTo(0.9)
    expect(parseBackgroundAlpha('rgb(255, 255, 255)')).toBe(1)
  })
})

describe('shouldPaintOpaqueLightSurface', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    resetActiveSitePolicyForTests()
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 800,
    })
  })

  it('透明层与 allowlist 外节点不铺底', () => {
    const transparent = document.createElement('div')
    transparent.className = 'h-c-page'
    transparent.style.background = 'transparent'
    document.body.appendChild(transparent)
    expect(shouldPaintOpaqueLightSurface(transparent)).toBe(false)

    const generic = document.createElement('div')
    generic.style.background = 'rgb(255, 255, 255)'
    document.body.appendChild(generic)
    expect(shouldPaintOpaqueLightSurface(generic)).toBe(false)
  })

  it('allowlist 实色浅底可铺底', () => {
    const textBox = document.createElement('div')
    textBox.className = 'secondary-hero__text-box'
    textBox.style.backgroundColor = 'rgb(255, 255, 255)'
    document.body.appendChild(textBox)
    expect(shouldPaintOpaqueLightSurface(textBox)).toBe(true)

    const panel = document.createElement('section')
    panel.style.backgroundColor = 'rgb(255, 255, 255)'
    mockRect(panel, 500, 300, 50, 50)
    document.body.appendChild(panel)
    expect(shouldPaintOpaqueLightSurface(panel)).toBe(true)
  })
})

describe('sweepDocumentLightSurfaces', () => {
  const budget = { maxNodes: 120, maxMs: 35 }

  beforeEach(() => {
    document.documentElement.innerHTML = ''
    document.body.innerHTML = ''
    document.body.style.cssText = ''
  })

  it('视口采样穿透透明 wrapper 只铺 main，不铺 h-c-page', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 800,
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 600,
    })

    const main = document.createElement('main')
    main.className = 'gmp-page'
    main.style.backgroundColor = 'rgb(255, 255, 255)'
    main.style.width = '700px'
    main.style.height = '500px'

    const wrapper = document.createElement('div')
    wrapper.className = 'h-c-page'
    wrapper.style.background = 'transparent'
    wrapper.style.width = '700px'
    wrapper.style.height = '500px'
    main.appendChild(wrapper)
    document.body.appendChild(main)

    document.elementsFromPoint = () => [wrapper, main, document.body, document.documentElement]

    const count = sweepDocumentLightSurfaces(document, budget)
    expect(count).toBeGreaterThan(0)
    expect(main.style.getPropertyValue('background-color')).toBe(THEME_PAGE_BACKGROUND_CSS)
    expect(wrapper.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(false)
  })
})
