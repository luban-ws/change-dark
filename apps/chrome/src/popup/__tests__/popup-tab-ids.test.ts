import { describe, expect, it } from 'vitest'
import {
  POPUP_PANEL_MAIN_ID,
  POPUP_PANEL_SUPPORT_ID,
  POPUP_TAB_MAIN_BTN_ID,
  POPUP_TAB_PANEL_INACTIVE_CLASS,
  POPUP_TAB_SUPPORT_BTN_ID,
} from '../popup-tab-ids'

describe('popup-tab-ids', () => {
  it('keeps ids unique for tab markup', () => {
    const ids = [
      POPUP_TAB_MAIN_BTN_ID,
      POPUP_TAB_SUPPORT_BTN_ID,
      POPUP_PANEL_MAIN_ID,
      POPUP_PANEL_SUPPORT_ID,
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reserves inactive class string for tab panels', () => {
    expect(POPUP_TAB_PANEL_INACTIVE_CLASS).toBe('cd-tab-panel--inactive')
  })
})
