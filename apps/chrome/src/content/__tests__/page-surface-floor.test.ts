/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { THEME_PAGE_BACKGROUND_CSS } from '@change-dark/extension-settings'
import {
  applyPageSurfaceFloor,
  clearPageSurfaceFloor,
} from '../page-surface-floor'
import { SURFACE_FLOOR_ATTR } from '../light-surface-utils'

describe('applyPageSurfaceFloor', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = ''
    document.body.innerHTML = ''
    document.body.style.cssText = ''
    document.documentElement.style.cssText = ''
  })

  it('铺 body 与实色浅底地标，不铺透明 wrapper / 组件', () => {
    const main = document.createElement('main')
    main.className = 'gmp-page'
    main.style.backgroundColor = 'rgb(255, 255, 255)'
    document.body.appendChild(main)

    const transparentWrap = document.createElement('div')
    transparentWrap.className = 'h-c-page'
    transparentWrap.style.background = 'transparent'
    main.appendChild(transparentWrap)

    const textBox = document.createElement('div')
    textBox.className = 'secondary-hero__text-box'
    textBox.style.backgroundColor = 'rgb(255, 255, 255)'
    main.appendChild(textBox)

    applyPageSurfaceFloor(document)

    expect(document.body.style.getPropertyValue('background-color')).toBe(
      THEME_PAGE_BACKGROUND_CSS,
    )
    expect(main.style.getPropertyValue('background-color')).toBe(THEME_PAGE_BACKGROUND_CSS)
    expect(transparentWrap.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(false)
    expect(textBox.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(false)

    clearPageSurfaceFloor(document)
    expect(document.body.style.getPropertyValue('background-color')).toBe('')
  })
})
