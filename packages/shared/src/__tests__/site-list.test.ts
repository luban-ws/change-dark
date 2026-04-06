import { describe, expect, it } from 'vitest'

import {
  SITE_LIST_MODE_INVERT_LISTED_ONLY,
  SITE_LIST_MODE_NOT_INVERT_LISTED,
} from '../constants'
import {
  globMatchHostname,
  hostnameLabelFromHttpOrigin,
  matchesSiteRule,
  normalizeHttpOriginFromUrl,
  parseSiteListState,
  shouldApplyForcedDarkFromSiteList,
  siteListRulesMatch,
  toggleDenylistOrigin,
} from '../site-list'

describe('hostnameLabelFromHttpOrigin', () => {
  it('从 http(s) origin 得到 hostname', () => {
    expect(hostnameLabelFromHttpOrigin('https://sub.example.com')).toBe('sub.example.com')
    expect(hostnameLabelFromHttpOrigin('http://localhost:3000')).toBe('localhost')
    expect(hostnameLabelFromHttpOrigin('https://a.co:8443')).toBe('a.co')
  })
})

describe('normalizeHttpOriginFromUrl', () => {
  it('仅 http/https 返回 origin', () => {
    expect(normalizeHttpOriginFromUrl('https://a.com/x?y=1')).toBe('https://a.com')
    expect(normalizeHttpOriginFromUrl('http://b.com:8080/')).toBe('http://b.com:8080')
  })

  it('chrome:// / file:// 返回 null', () => {
    expect(normalizeHttpOriginFromUrl('chrome://settings/')).toBeNull()
    expect(normalizeHttpOriginFromUrl('file:///tmp/a.html')).toBeNull()
  })
})

describe('parseSiteListState（RFC 017 迁移）', () => {
  it('空或非法为默认 not-invert + 空 entries', () => {
    expect(parseSiteListState(undefined).entries).toEqual([])
    expect(parseSiteListState({}).entries).toEqual([])
    expect(parseSiteListState({ denylist: 1 }).entries).toEqual([])
  })

  it('遗留 denylist → entries + not-invert', () => {
    expect(
      parseSiteListState({
        denylist: ['https://z.com', 'https://a.com', 'https://a.com'],
      }).entries,
    ).toEqual(['https://a.com', 'https://z.com'])
  })

  it('v2 保留 mode 与 entries', () => {
    const s = parseSiteListState({
      v: 2,
      mode: SITE_LIST_MODE_INVERT_LISTED_ONLY,
      entries: ['https://a.com'],
    })
    expect(s.mode).toBe(SITE_LIST_MODE_INVERT_LISTED_ONLY)
    expect(s.entries).toEqual(['https://a.com'])
  })
})

describe('globMatchHostname', () => {
  it('google.* 与 *.google.com', () => {
    expect(globMatchHostname('google.*', 'google.com')).toBe(true)
    expect(globMatchHostname('*.google.com', 'www.google.com')).toBe(true)
    expect(globMatchHostname('*.google.com', 'google.com')).toBe(false)
  })
})

describe('matchesSiteRule 与正则', () => {
  it('斜杠正则 /www\\.google\\..*/', () => {
    const origin = 'https://www.google.com'
    const hostname = 'www.google.com'
    expect(matchesSiteRule('/www\\.google\\..*/', origin, hostname)).toBe(true)
  })
})

describe('shouldApplyForcedDarkFromSiteList', () => {
  const origin = 'https://www.example.com'

  it('not-invert：列表命中 → 不套用', () => {
    const s = parseSiteListState({
      v: 2,
      mode: SITE_LIST_MODE_NOT_INVERT_LISTED,
      entries: ['https://www.example.com'],
    })
    expect(shouldApplyForcedDarkFromSiteList(origin, s)).toBe(false)
  })

  it('invert-only：列表命中 → 套用', () => {
    const s = parseSiteListState({
      v: 2,
      mode: SITE_LIST_MODE_INVERT_LISTED_ONLY,
      entries: ['https://www.example.com'],
    })
    expect(shouldApplyForcedDarkFromSiteList(origin, s)).toBe(true)
  })

  it('glob 命中 not-invert', () => {
    const s = parseSiteListState({
      v: 2,
      mode: SITE_LIST_MODE_NOT_INVERT_LISTED,
      entries: ['*.example.com'],
    })
    expect(shouldApplyForcedDarkFromSiteList(origin, s)).toBe(false)
  })
})

describe('toggleDenylistOrigin', () => {
  it('增删精确 origin', () => {
    let s = parseSiteListState({ denylist: [] })
    s = toggleDenylistOrigin('https://x.com', s)
    expect(siteListRulesMatch('https://x.com', 'x.com', s.entries)).toBe(true)
    s = toggleDenylistOrigin('https://x.com', s)
    expect(s.entries).toEqual([])
  })
})
