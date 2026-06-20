import { describe, expect, it } from 'vitest'

import { mergeSitePolicies } from '../merge'
import { matchSiteProfiles } from '../match'
import { resolveSitePolicy, BUNDLED_SITE_CATALOG } from '../resolve'

describe('matchSiteProfiles', () => {
  it('匹配 hostSuffix', () => {
    const matched = matchSiteProfiles(
      'https://marketingplatform.google.com',
      '/about/analytics/',
      BUNDLED_SITE_CATALOG,
    )
    expect(matched.map((p) => p.id)).toContain('google-marketing-platform')
  })

  it('不匹配无关站点', () => {
    const matched = matchSiteProfiles(
      'https://example.com',
      '/',
      BUNDLED_SITE_CATALOG,
    )
    expect(matched).toHaveLength(0)
  })
})

describe('mergeSitePolicies', () => {
  it('neverPaint 并集', () => {
    const matched = matchSiteProfiles(
      'https://marketingplatform.google.com',
      '/',
      BUNDLED_SITE_CATALOG,
    )
    const policy = mergeSitePolicies(matched)
    expect(policy.surfaceRepair.neverPaintSelectors).toContain('.h-c-page')
    expect(policy.surfaceRepair.neverPaintSelectorList).toContain('.h-c-page')
    expect(policy.matchedProfileIds).toContain('google-marketing-platform')
  })

  it('userPatch.disabled 跳过 bundled', () => {
    const matched = matchSiteProfiles(
      'https://marketingplatform.google.com',
      '/',
      BUNDLED_SITE_CATALOG,
    )
    const policy = mergeSitePolicies(matched, { disabled: true })
    expect(policy.matchedProfileIds).toHaveLength(0)
    expect(policy.surfaceRepair.neverPaintSelectors).not.toContain('.h-c-page')
  })
})

describe('resolveSitePolicy', () => {
  it('GMP 页合并 gutterProbe', () => {
    const policy = resolveSitePolicy(
      'https://marketingplatform.google.com',
      '/about/analytics/',
    )
    expect(policy.surfaceRepair.gutterProbe?.mainSelector).toBe('main.gmp-page')
    expect(policy.surfaceRepair.gutterProbe?.insetPx).toBe(24)
    expect(policy.surfaceRepair.neverPaintSelectors).toContain('.h-c-page')
    expect(policy.customCss).toBe('')
  })
})
