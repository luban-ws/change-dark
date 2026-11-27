import { describe, expect, it } from 'vitest'

import { GLOBAL_DEFAULT_SITE_POLICY } from '../defaults'
import { mergeSitePolicies } from '../merge'
import { matchSiteProfiles } from '../match'
import {
  BUNDLED_SITE_CATALOG,
  loadSiteCatalogFromThemes,
  resolveSitePolicy,
} from '../resolve'
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

  it('userPatchDsl 直接通过 Rust WASM 执行 .theme patch 源码（无中间 JSON）', () => {
    const policy = resolveSitePolicy('https://docs.example.com/guide', {
      userPatchDsl: `patch {
        surfaceRepair {
          neverPaint [".hero-banner"]
          minPanelAreaPx 9000
        }
        customCss ".doc-note { opacity: 0.9; }"
      }`,
    })
    expect(policy.surfaceRepair.neverPaintSelectors).toContain('.hero-banner')
    expect(policy.surfaceRepair.minPanelAreaPx).toBe(9000)
    expect(policy.customCss).toBe('.doc-note { opacity: 0.9; }')
  })

  it('userPatchDsl 语法错误时安全降级为默认策略', () => {
    const policy = resolveSitePolicy('https://example.com/', {
      userPatchDsl: 'patch { disabled maybe }',
    })
    expect(policy).toBe(GLOBAL_DEFAULT_SITE_POLICY)
  })
})

describe('loadSiteCatalogFromThemes', () => {
  it('直接从 .theme 原文件编译按 id 排序的档案目录', () => {
    const catalog = loadSiteCatalogFromThemes({
      './catalog/z.theme': 'profile "z-site" { match { hostEquals ["z.test"] } }\n',
      './catalog/a.theme': 'profile "a-site" { match { hostEquals ["a.test"] } }\n',
    })
    expect(catalog.map((p) => p.id)).toEqual(['a-site', 'z-site'])
    expect(catalog[0]?.v).toBe(1)
  })

  it('语法错误抛出带文件名与行列号的诊断信息', () => {
    expect(() =>
      loadSiteCatalogFromThemes({
        './catalog/bad.theme': 'profile "bad" {\n  match { hostEquals ["x.test"] }\n  unknownField 1\n}\n',
      }),
    ).toThrow(/bad\.theme:3:3/)
  })

  it('跨文件重复 profile id 时拒绝合并', () => {
    expect(() =>
      loadSiteCatalogFromThemes({
        './catalog/one.theme': 'profile "dup" { match { hostEquals ["one.test"] } }\n',
        './catalog/two.theme': 'profile "dup" { match { hostEquals ["two.test"] } }\n',
      }),
    ).toThrow(/duplicate profile id "dup"/)
  })
})
