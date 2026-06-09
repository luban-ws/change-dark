import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, within } from '@testing-library/react'
import { Theme } from '@radix-ui/themes'

vi.hoisted(() => {
  globalThis.chrome = {
    i18n: { getUILanguage: () => 'zh-CN' },
    storage: { local: { get: async () => ({}), set: async () => {} } },
  } as typeof chrome
})

import { POPUP_LOCALES } from '../i18n'
import { ThemeFiltersPanel } from '../components/ThemeFiltersPanel'
import { TypographyPanel } from '../components/TypographyPanel'

const zhT = (key: keyof typeof POPUP_LOCALES.zh_CN.translation) =>
  POPUP_LOCALES.zh_CN.translation[key]

vi.mock('../usePopupT', () => ({
  usePopupT: () => ({
    t: (key: keyof typeof POPUP_LOCALES.zh_CN.translation) =>
      POPUP_LOCALES.zh_CN.translation[key],
    i18n: { language: 'zh_CN', changeLanguage: vi.fn() },
    lng: 'zh_CN' as const,
  }),
}))

function renderPanel(ui: React.ReactElement) {
  return render(
    <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
      {ui}
    </Theme>,
  )
}

describe('popup zh labels (usePopupT)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ThemeFiltersPanel 显示中文标题与滑块标签', () => {
    const { container } = renderPanel(
      <ThemeFiltersPanel
        filters={{ brightness: 100, contrast: 100, sepia: 0, saturate: 100 }}
        onChange={() => {}}
      />,
    )
    expect(within(container).getByText(zhT('filters'))).toBeDefined()
    expect(within(container).getByText(zhT('lblBrightness'))).toBeDefined()
    expect(within(container).queryByText('Theme Filters')).toBeNull()
    expect(within(container).queryByText('Brightness')).toBeNull()
  })

  it('TypographyPanel 显示中文标题与字体选项', () => {
    const { container } = renderPanel(
      <TypographyPanel
        typography={{
          fontEnabled: false,
          fontPreset: 'system',
          customFontFamily: '',
          textStrokeEnabled: false,
          textStrokeWidthPx: 0.06,
        }}
        onChange={() => {}}
      />,
    )
    expect(within(container).getByText(zhT('typography'))).toBeDefined()
    expect(within(container).getByText(zhT('lblEnableFont'))).toBeDefined()
    expect(within(container).getByText(zhT('lblFontSystem'))).toBeDefined()
    expect(within(container).queryByText('Typography & Stroke')).toBeNull()
    expect(within(container).queryByText('Override Font')).toBeNull()
    expect(within(container).queryByText('System UI')).toBeNull()
  })
})
