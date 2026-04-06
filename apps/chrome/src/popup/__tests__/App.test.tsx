import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

const mockPersistGlobalPolicy = vi.fn(() => Promise.resolve())
const mockPersistThemeMode = vi.fn(() => Promise.resolve())
const mockPersistPagePalette = vi.fn(() => Promise.resolve())
const mockPersistThemeFiltersState = vi.fn(() => Promise.resolve())
const mockPersistTypographyState = vi.fn(() => Promise.resolve())
const mockPersistSiteCustomCss = vi.fn(() => Promise.resolve())
const mockToggleCurrentOrigin = vi.fn(() => Promise.resolve())
const mockClearSiteOverride = vi.fn(() => Promise.resolve())
const mockPersistSiteListState = vi.fn(() => Promise.resolve())

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fb: string) => fb || key,
    i18n: { language: 'en', changeLanguage: vi.fn() }
  }),
}))

vi.mock("@luban-ws/shared", async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    readGlobalPolicy: vi.fn(() => Promise.resolve('on')),
    readThemeMode: vi.fn(() => Promise.resolve('filter-css')),
    readThemeFiltersState: vi.fn(() => Promise.resolve({ brightness: 100, contrast: 100, sepia: 0, saturate: 100 })),
    readPagePalette: vi.fn(() => Promise.resolve('dark')),
    readTypographyState: vi.fn(() => Promise.resolve({ v: 1, fontEnabled: false, fontPreset: '', customFontFamily: '', textStrokeEnabled: false, textStrokeWidthPx: 0 })),
    readSiteListState: vi.fn(() => Promise.resolve({ mode: 'not-invert-listed', entries: [] })),
    readSiteOverridesState: vi.fn(() => Promise.resolve({ origins: {} })),
    readSiteCustomCssForPage: vi.fn(() => Promise.resolve('')),
    hasSiteScopedDataForOrigin: vi.fn(() => Promise.resolve(false)),
    persistGlobalPolicy: (...args: any[]) => mockPersistGlobalPolicy(...args),
    persistThemeMode: (...args: any[]) => mockPersistThemeMode(...args),
    persistPagePalette: (...args: any[]) => mockPersistPagePalette(...args),
    persistThemeFiltersState: (...args: any[]) => mockPersistThemeFiltersState(...args),
    persistTypographyState: (...args: any[]) => mockPersistTypographyState(...args),
    persistSiteCustomCssForOrigin: (...args: any[]) => mockPersistSiteCustomCss(...args),
    persistSiteListState: (...args: any[]) => mockPersistSiteListState(...args),
    toggleCurrentOriginInDenylist: (...args: any[]) => mockToggleCurrentOrigin(...args),
    clearSiteOverrideForOrigin: (...args: any[]) => mockClearSiteOverride(...args),
    upsertSiteThemeModeOverride: vi.fn(),
    upsertSitePagePaletteOverride: vi.fn(),
    upsertSiteThemeFiltersOverride: vi.fn(),
    upsertSiteTypographyOverride: vi.fn(),
  }
})

global.chrome = {
  // @ts-ignore
  storage: {
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ url: 'http://example.com' }]))
  }
}

describe('App & usePopupState Integration Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts and switches to Support tab', () => {
    render(<App />)
    expect(screen.getByText('Force dark rules')).toBeDefined()
    fireEvent.click(screen.getByText('Support'))
    expect(screen.getByText('Support the author')).toBeDefined()
  })

  it('dispatches global policy storage changes', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('Off'))
    expect(mockPersistGlobalPolicy).toHaveBeenCalledWith('off')
  })

  it('dispatches theme mode storage changes', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('Dynamic (Expr)'))
    expect(mockPersistThemeMode).toHaveBeenCalledWith('dynamic')
  })

  it('dispatches page palette storage changes', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('Solarized'))
    expect(mockPersistPagePalette).toHaveBeenCalledWith('solarized-dark')
  })
  
  it('dispatches typography changes', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('Override Font'))
    expect(mockPersistTypographyState).toHaveBeenCalled()
  })
  
  it('dispatches specific site origin toggle', async () => {
    const { container } = render(<App />)
    await waitFor(() => expect(screen.getByText('example.com')).toBeDefined())
    const toggleBtn = container.querySelector('.cd-site-switch') as HTMLButtonElement
    fireEvent.click(toggleBtn)
    expect(mockToggleCurrentOrigin).toHaveBeenCalledWith('http://example.com')
  })

  it('dispatches site list mode changes', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('Whitelist'))
    expect(mockPersistSiteListState).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'invert-listed-only'
    }))
  })
})
