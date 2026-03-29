import { describe, expect, it } from 'vitest'

import {
  MAX_SITE_CUSTOM_CSS_CHARS,
  parseSiteCustomCssState,
  sanitizeSiteCustomCss,
} from './site-custom-css'

describe('RFC 019 site-custom-css', () => {
  it('sanitizeSiteCustomCss 去空字节、截断、弱化 breakout 与 javascript:', () => {
    expect(sanitizeSiteCustomCss('a\0b')).toBe('ab')
    expect(sanitizeSiteCustomCss('x'.repeat(MAX_SITE_CUSTOM_CSS_CHARS + 10)).length).toBe(
      MAX_SITE_CUSTOM_CSS_CHARS,
    )
    expect(sanitizeSiteCustomCss('body{color:red}</style><script>')).not.toContain('</style>')
    expect(sanitizeSiteCustomCss('url(javascript:evil)')).not.toContain('javascript:')
  })

  it('parseSiteCustomCssState 过滤非法 origin 与结构', () => {
    expect(parseSiteCustomCssState(undefined).byOrigin).toEqual({})
    const s = parseSiteCustomCssState({
      v: 1,
      byOrigin: {
        'https://ok.example': { css: 'a { color: red }' },
        bogus: { css: 'x' },
      },
    })
    expect(s.byOrigin['https://ok.example']?.css).toContain('color: red')
    expect(s.byOrigin.bogus).toBeUndefined()
  })
})
