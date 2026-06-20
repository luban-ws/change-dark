/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { THEME_PAGE_BACKGROUND_CSS } from '@change-dark/extension-settings'
import { SURFACE_FLOOR_ATTR } from '../light-surface-utils'
import { resetActiveSitePolicyForTests } from '../site-policy'
import { sweepFixedChromeSurfaces } from '../fixed-chrome-sweep'

describe('sweepFixedChromeSurfaces', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    resetActiveSitePolicyForTests()
  })

  it('同步铺 fixed header bar 实色浅底', () => {
    const bar = document.createElement('div')
    bar.className = 'h-c-header__bar gmp-header__bar'
    bar.style.backgroundColor = 'rgb(255, 255, 255)'
    bar.style.position = 'fixed'
    document.body.appendChild(bar)

    expect(sweepFixedChromeSurfaces(document)).toBe(1)
    expect(bar.hasAttribute(SURFACE_FLOOR_ATTR)).toBe(true)
    expect(bar.style.getPropertyValue('background-color')).toBe(THEME_PAGE_BACKGROUND_CSS)
  })
})
