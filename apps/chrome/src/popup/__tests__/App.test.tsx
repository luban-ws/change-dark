import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Theme } from '@radix-ui/themes'

/** 避免加载真实 `i18n.ts`：其模块顶层会访问 `chrome.i18n` / `storage.local`。 */
const popupEn = vi.hoisted(() => ({
  extName: 'Selena',
  extSubtitle: 'Force dark · Adjust global rules and site themes here',
  tabSettings: 'Settings',
  tabSupport: 'Support',
  lblLangZh: '中文',
  lblLangEn: 'English',
  lblCurrentSite: 'Current Site',
  lblNoOrigin: 'Open a web page to enable site rules.',
  lblSiteForced: 'This site is forced dark by site list rules.',
  lblSiteNotForced: 'This site follows global dark mode rules.',
  lblNoHostname: '—',
  globalSwitch: 'Global Switch',
  lblAuto: 'Auto',
  lblOn: 'On',
  lblOff: 'Off',
  lblThreshold: 'Auto-Dark Threshold',
  lblStrict: 'Strict',
  lblRelaxed: 'Relaxed',
  lblScopeGlobal: 'Global',
  lblScopeSite: 'This Site',
  lblClearSiteOverride: 'Clear site override',
  pagePalette: 'Page Palette',
  lblPaletteDark: 'Dark',
  lblPaletteSolarized: 'Solarized',
  filters: 'Theme Filters',
  lblBrightness: 'Brightness',
  lblContrast: 'Contrast',
  lblSepia: 'Sepia',
  lblSaturate: 'Saturate',
  typography: 'Typography & Stroke',
  lblEnableFont: 'Override Font',
  lblSelectFont: 'Select font…',
  lblFontSystem: 'System UI',
  lblFontSans: 'Sans Serif',
  lblFontSerif: 'Serif',
  lblFontMono: 'Monospace',
  lblFontCustom: 'Custom…',
  lblFontFamilyPlaceholder: 'Font family…',
  lblEnableStroke: 'Text Stroke (0.01px to 1px)',
  customCss: 'Per-Site Custom CSS',
  siteList: 'Site List Settings',
  lblSiteListBlacklist: 'Blacklist',
  lblSiteListWhitelist: 'Whitelist',
  lblSiteListPlaceholder: 'example.com\ngithub.com',
  supportTitle: 'Support the Author',
  supportHelp: 'If this extension helps you, consider buying me a coffee.',
  altQrCode: 'Support QR code',
} as const))

vi.mock('../i18n', () => ({
  default: {},
  STORAGE_KEY_LANG: 'ui_language',
  POPUP_LOCALES: { en: { translation: popupEn } },
}))

/** 供 `vi.mock('@luban-ws/extension-settings')` 工厂闭包引用（必须 hoisted）。 */
const popupMocks = vi.hoisted(() => ({
  mockPersistGlobalPolicy: vi.fn(async (_p: string) => {}),
  mockPersistPagePalette: vi.fn(async (_p: string) => {}),
  mockPersistThemeFiltersState: vi.fn(async (_f: unknown) => {}),
  mockPersistTypographyState: vi.fn(async (_t: unknown) => {}),
  mockPersistSiteCustomCss: vi.fn(async (_o: string, _c: string) => {}),
  mockToggleCurrentOrigin: vi.fn(async (_o: string) => {}),
  mockClearSiteOverride: vi.fn(async (_o: string) => {}),
  mockPersistSiteListState: vi.fn(async (_s: unknown) => {}),
}))

import App from '../App'

const EN = popupEn

const {
  mockPersistGlobalPolicy,
  mockPersistPagePalette,
  mockPersistThemeFiltersState,
  mockPersistTypographyState,
  mockPersistSiteCustomCss,
  mockToggleCurrentOrigin,
  mockClearSiteOverride,
  mockPersistSiteListState,
} = popupMocks

vi.mock('../usePopupT', () => ({
  usePopupT: () => ({
    t: (key: keyof typeof popupEn) => popupEn[key] ?? key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
    lng: 'en' as const,
  }),
}))

vi.mock('@luban-ws/extension-settings', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    readGlobalPolicy: vi.fn(() => Promise.resolve('on')),
    readThemeFiltersState: vi.fn(() => Promise.resolve({ brightness: 100, contrast: 100, sepia: 0, saturate: 100 })),
    readPagePalette: vi.fn(() => Promise.resolve('dark')),
    readTypographyState: vi.fn(() => Promise.resolve({ v: 1, fontEnabled: false, fontPreset: '', customFontFamily: '', textStrokeEnabled: false, textStrokeWidthPx: 0 })),
    readSiteListState: vi.fn(() => Promise.resolve({ mode: 'not-invert-listed', entries: [] })),
    readSiteOverridesState: vi.fn(() => Promise.resolve({ origins: {} })),
    readSiteCustomCssForPage: vi.fn(() => Promise.resolve('')),
    hasSiteScopedDataForOrigin: vi.fn(() => Promise.resolve(false)),
    persistGlobalPolicy: (p: unknown) => popupMocks.mockPersistGlobalPolicy(p as string),
    persistPagePalette: (p: unknown) => popupMocks.mockPersistPagePalette(p as string),
    persistThemeFiltersState: (f: unknown) => popupMocks.mockPersistThemeFiltersState(f),
    persistTypographyState: (t: unknown) => popupMocks.mockPersistTypographyState(t),
    persistSiteCustomCssForOrigin: (o: unknown, c: unknown) =>
      popupMocks.mockPersistSiteCustomCss(o as string, c as string),
    persistSiteListState: (s: unknown) => popupMocks.mockPersistSiteListState(s),
    toggleCurrentOriginInDenylist: (o: unknown) => popupMocks.mockToggleCurrentOrigin(o as string),
    clearSiteOverrideForOrigin: (o: unknown) => popupMocks.mockClearSiteOverride(o as string),
    upsertSitePagePaletteOverride: vi.fn(),
    upsertSiteThemeFiltersOverride: vi.fn(),
    upsertSiteTypographyOverride: vi.fn(),
    readAutoDarkThreshold: vi.fn(() => Promise.resolve(80)),
    persistAutoDarkThreshold: vi.fn(() => Promise.resolve()),
  }
})

/** Popup 单测 shim：`i18n.ts` 会读 `chrome.i18n` / `storage.local.get`。 */
global.chrome = {
  i18n: {
    getUILanguage: vi.fn(() => 'en'),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn(),
      addRules: vi.fn(),
      getRules: vi.fn(),
      removeRules: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ url: 'http://example.com' } as chrome.tabs.Tab])),
  },
} as unknown as typeof chrome

/** 与 `main.tsx` 一致：`Select` 等组件依赖 Radix `Theme` 上下文。 */
function renderApp(ui: React.ReactElement = <App />) {
  const utils = render(
    <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
      {ui}
    </Theme>,
  )
  return utils
}

/** Radix Theme 在 jsdom 下可能重复挂载节点；所有断言限定在首个 Popup 根（`App` 的 `theme-mode-*` 容器）。 */
function appSurface(container: HTMLElement): HTMLElement {
  const el = container.querySelector('[class*="theme-mode-"]')
  if (!el) throw new Error('missing App root with theme-mode-* class')
  return el as HTMLElement
}

describe('App & usePopupState Integration Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts and exposes Support tab trigger', async () => {
    const { container } = renderApp()
    const app = appSurface(container)
    expect(await within(app).findByText(EN.extSubtitle)).toBeDefined()
    const tablist = within(app).getByRole('tablist')
    const supportTrigger = tablist.querySelector('[id$="-trigger-support"]')
    expect(supportTrigger).toBeTruthy()
    // Radix Tabs 面板切换在 jsdom + fireEvent 下不可靠；真机交互见 E2E（RFC 026）。
  })

  it('dispatches global policy storage changes', async () => {
    const { container } = renderApp()
    const app = appSurface(container)
    await within(app).findByText(EN.extSubtitle)
    fireEvent.click(within(app).getAllByText(EN.lblOff)[0]!)
    expect(mockPersistGlobalPolicy).toHaveBeenCalledWith('off')
  })

  it('dispatches page palette storage changes', async () => {
    const { container } = renderApp()
    const app = appSurface(container)
    fireEvent.click(within(app).getAllByText(EN.lblPaletteSolarized)[0]!)
    expect(mockPersistPagePalette).toHaveBeenCalledWith('solarized-dark')
  })
  
  it('dispatches typography changes', async () => {
    const { container } = renderApp()
    const app = appSurface(container)
    await within(app).findByText(EN.typography)
    const typoCard = within(app).getByText(EN.typography).closest('.rt-Card') as HTMLElement
    const fontSwitch = within(typoCard).getAllByRole('switch')[0]!
    fireEvent.click(fontSwitch)
    expect(mockPersistTypographyState).toHaveBeenCalled()
  })
  
  it('dispatches specific site origin toggle', async () => {
    const { container } = renderApp()
    const app = appSurface(container)
    await within(app).findAllByText('example.com')
    const siteSwitch = within(app).getAllByRole('switch')[0]!
    fireEvent.click(siteSwitch)
    expect(mockToggleCurrentOrigin).toHaveBeenCalledWith('http://example.com')
  })

  it('dispatches site list mode changes', async () => {
    const { container } = renderApp()
    const app = appSurface(container)
    fireEvent.click(within(app).getAllByText(EN.lblScopeSite)[0]!)
    fireEvent.click(within(app).getAllByText(EN.lblSiteListWhitelist)[0]!)
    expect(mockPersistSiteListState).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'invert-listed-only'
    }))
  })
})
