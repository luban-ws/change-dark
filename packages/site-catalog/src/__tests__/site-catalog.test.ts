import { describe, expect, it } from 'vitest'

import { GLOBAL_DEFAULT_SITE_POLICY } from '../defaults'
import { mergeSitePolicies } from '../merge'
import { matchSiteProfiles } from '../match'
import { resolveSitePolicy, BUNDLED_SITE_CATALOG } from '../resolve'
import type { SiteProfileV1 } from '../types'

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
  it('userPatch without componentClassHints 保留下层 hint', () => {
    const baseProfile: SiteProfileV1 = {
      v: 1,
      id: 'base-with-hints',
      match: { hostEquals: ['example.com'] },
      priority: 10,
      surfaceRepair: {
        componentClassHints: ['custom-hero-banner'],
        minPanelAreaPx: 12000,
        gutterProbe: { mainSelector: 'main.base', insetPx: 16 },
      },
    }
    const higherProfile: SiteProfileV1 = {
      v: 1,
      id: 'higher-override',
      match: { hostEquals: ['example.com'] },
      priority: 20,
      surfaceRepair: {
        minPanelAreaPx: 4000,
        gutterProbe: { mainSelector: 'main.higher', insetPx: 32 },
      },
    }
    const policy = mergeSitePolicies([higherProfile, baseProfile], {
      surfaceRepair: { minPanelWidthPx: 220 },
    })
    expect(policy.matchedProfileIds).toEqual(['higher-override', 'base-with-hints'])
    expect(policy.surfaceRepair.minPanelAreaPx).toBe(4000)
    expect(policy.surfaceRepair.minPanelWidthPx).toBe(220)
    expect(policy.surfaceRepair.gutterProbe).toEqual({
      mainSelector: 'main.higher',
      insetPx: 32,
    })
    expect(policy.surfaceRepair.componentClassHintRe.test('custom-hero-banner')).toBe(true)
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

  it('单参数 full-URL 重载解析 host 与 pathname', () => {
    const policy = resolveSitePolicy(
      'https://marketingplatform.google.com/about/',
    )
    expect(policy.matchedProfileIds).toContain('google-marketing-platform')
    expect(policy.surfaceRepair.gutterProbe?.mainSelector).toBe('main.gmp-page')
    expect(policy.surfaceRepair.neverPaintSelectors).toContain('.h-c-page')
  })

  it('未命中且无 userPatch 时返回 GLOBAL_DEFAULT_SITE_POLICY', () => {
    const policy = resolveSitePolicy('https://example.com/')
    expect(policy).toBe(GLOBAL_DEFAULT_SITE_POLICY)
  })
})
