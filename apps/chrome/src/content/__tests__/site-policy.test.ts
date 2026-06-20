/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { resolveSitePolicy } from '@change-dark/site-catalog'

import { shouldPaintOpaqueLightSurface } from '../light-surface-utils'
import { resetActiveSitePolicyForTests } from '../site-policy'

describe('site policy integration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    resetActiveSitePolicyForTests()
  })

  it('GMP profile neverPaint 阻止 h-c-page 铺底', () => {
    const policy = resolveSitePolicy(
      'https://marketingplatform.google.com',
      '/about/analytics/',
    )
    expect(policy.matchedProfileIds).toContain('google-marketing-platform')

    const grid = document.createElement('div')
    grid.className = 'h-c-page'
    grid.style.backgroundColor = 'rgb(255, 255, 255)'
    document.body.appendChild(grid)

    expect(shouldPaintOpaqueLightSurface(grid, policy.surfaceRepair)).toBe(false)
  })
})
