import { describe, expect, it } from 'vitest'

import {
  isOriginInDenylist,
  normalizeHttpOriginFromUrl,
  parseSiteListState,
  toggleDenylistOrigin,
} from './site-list'

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

describe('parseSiteListState', () => {
  it('空或非法为 []', () => {
    expect(parseSiteListState(undefined).denylist).toEqual([])
    expect(parseSiteListState({}).denylist).toEqual([])
    expect(parseSiteListState({ denylist: 1 }).denylist).toEqual([])
  })

  it('去重并排序', () => {
    expect(
      parseSiteListState({
        denylist: ['https://z.com', 'https://a.com', 'https://a.com'],
      }).denylist,
    ).toEqual(['https://a.com', 'https://z.com'])
  })
})

describe('toggleDenylistOrigin', () => {
  it('增删切换', () => {
    let s = parseSiteListState({ denylist: [] })
    s = toggleDenylistOrigin('https://x.com', s)
    expect(isOriginInDenylist('https://x.com', s)).toBe(true)
    s = toggleDenylistOrigin('https://x.com', s)
    expect(s.denylist).toEqual([])
  })
})
