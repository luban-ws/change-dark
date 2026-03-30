import { describe, expect, it } from 'vitest'

import {
  POPUP_SITE_HOST_ID,
  POPUP_SITE_HINT_ID,
  POPUP_SITE_LIST_TOGGLE_ID,
  POPUP_SITE_QUICK_LEAD_ID,
  POPUP_SITE_SWITCH_CAPTION_ID,
} from './popup-current-site-ids'

describe('popup-current-site-ids', () => {
  it('与 index.html 中此站暗色区块 id 一致且互不重复', () => {
    const ids = [
      POPUP_SITE_LIST_TOGGLE_ID,
      POPUP_SITE_HINT_ID,
      POPUP_SITE_HOST_ID,
      POPUP_SITE_QUICK_LEAD_ID,
      POPUP_SITE_SWITCH_CAPTION_ID,
    ]
    expect(new Set(ids).size).toBe(ids.length)
    expect(POPUP_SITE_LIST_TOGGLE_ID).toBe('site-list-toggle')
    expect(POPUP_SITE_HINT_ID).toBe('site-hint')
    expect(POPUP_SITE_HOST_ID).toBe('site-current-host')
    expect(POPUP_SITE_QUICK_LEAD_ID).toBe('site-quick-lead')
    expect(POPUP_SITE_SWITCH_CAPTION_ID).toBe('site-switch-caption')
  })
})
