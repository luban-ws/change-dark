import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, within, fireEvent } from '@testing-library/react'
import { Theme } from '@radix-ui/themes'
import { POPUP_LOCALES } from '../i18n'
import { POPUP_USED_TRANSLATION_KEYS } from '../popup-translation-keys'
import App from '../App'

const zh = POPUP_LOCALES.zh_CN.translation

vi.hoisted(() => {
  globalThis.chrome = {
    i18n: { getUILanguage: () => 'zh-CN' },
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({ ui_language: 'zh_CN' })),
        set: vi.fn(() => Promise.resolve()),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([{ url: 'http://example.com' } as chrome.tabs.Tab])),
    },
  } as typeof chrome
})

vi.mock('../i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../i18n')>()
  return { ...actual, default: actual.default }
})

vi.mock('../usePopupT', () => ({
  usePopupT: () => ({
    t: (key: keyof typeof zh) => zh[key],
    i18n: { language: 'zh_CN', changeLanguage: vi.fn() },
    lng: 'zh_CN' as const,
  }),
}))

vi.mock('@change-dark/extension-settings', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    readGlobalPolicy: vi.fn(() => Promise.resolve('on')),
    readThemeFiltersState: vi.fn(() =>
      Promise.resolve({ brightness: 100, contrast: 100, sepia: 0, saturate: 100 }),
    ),
    readPagePalette: vi.fn(() => Promise.resolve('dark')),
    readTypographyState: vi.fn(() =>
      Promise.resolve({
        v: 1,
        fontEnabled: false,
        fontPreset: 'system',
        customFontFamily: '',
        textStrokeEnabled: false,
        textStrokeWidthPx: 0,
      }),
    ),
    readSiteListState: vi.fn(() => Promise.resolve({ mode: 'not-invert-listed', entries: [] })),
    readSiteOverridesState: vi.fn(() => Promise.resolve({ origins: {} })),
    readSiteCustomCssForPage: vi.fn(() => Promise.resolve('')),
    hasSiteScopedDataForOrigin: vi.fn(() => Promise.resolve(false)),
    persistGlobalPolicy: vi.fn(),
    persistPagePalette: vi.fn(),
    persistThemeFiltersState: vi.fn(),
    persistTypographyState: vi.fn(),
    persistSiteCustomCssForOrigin: vi.fn(),
    persistSiteListState: vi.fn(),
    toggleCurrentOriginInDenylist: vi.fn(),
    clearSiteOverrideForOrigin: vi.fn(),
    upsertSitePagePaletteOverride: vi.fn(),
    upsertSiteThemeFiltersOverride: vi.fn(),
    upsertSiteTypographyOverride: vi.fn(),
    readAutoDarkThreshold: vi.fn(() => Promise.resolve(80)),
    persistAutoDarkThreshold: vi.fn(),
  }
})

/** 设置页主流程上应可见的区块标题与关键控件文案。 */
const ZH_VISIBLE_SECTION_KEYS = [
  'extName',
  'extSubtitle',
  'tabSettings',
  'tabSupport',
  'lblCurrentSite',
  'globalSwitch',
  'lblAuto',
  'lblOn',
  'lblOff',
  'lblScopeGlobal',
  'lblScopeSite',
  'pagePalette',
  'lblPaletteDark',
  'lblPaletteSolarized',
  'filters',
  'lblBrightness',
  'lblContrast',
  'lblSepia',
  'lblSaturate',
  'typography',
  'lblEnableFont',
  'lblFontSystem',
  'lblEnableStroke',
  'customCss',
  'siteList',
  'lblSiteListBlacklist',
  'lblSiteListWhitelist',
] as const satisfies readonly (typeof POPUP_USED_TRANSLATION_KEYS)[number][]

describe('App 中文标签全覆盖', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('设置页所有区块标题与控件均为中文', async () => {
    const { container } = render(
      <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
        <App />
      </Theme>,
    )
    const app = container.querySelector('[class*="theme-mode-"]') as HTMLElement
    expect(app).toBeTruthy()

    await within(app).findByText(zh.extName)
    fireEvent.click(within(app).getAllByText(zh.lblScopeSite)[0]!)

    for (const key of ZH_VISIBLE_SECTION_KEYS) {
      const nodes = within(app).queryAllByText(zh[key])
      expect(nodes.length, `缺少中文: ${key} → ${zh[key]}`).toBeGreaterThan(0)
    }

    for (const key of ZH_VISIBLE_SECTION_KEYS) {
      const en = POPUP_LOCALES.en.translation[key]
      if (en === zh[key]) continue
      expect(within(app).queryByText(en), `仍显示英文: ${key} → ${en}`).toBeNull()
    }
  })
})
