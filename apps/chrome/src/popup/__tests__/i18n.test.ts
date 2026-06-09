import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  globalThis.chrome = {
    i18n: { getUILanguage: () => 'zh-CN' },
    storage: { local: { get: async () => ({}), set: async () => {} } },
  } as typeof chrome
})

import {
  POPUP_LOCALES,
  defaultPopupLanguageFromBrowser,
  normalizePopupLanguage,
  resolvePopupLanguage,
  type PopupTranslationKey,
} from '../i18n'
import {
  POPUP_USED_TRANSLATION_KEYS,
  POPUP_ZH_EN_SAME_ALLOWED,
} from '../popup-translation-keys'

describe('popup i18n locales', () => {
  const enKeys = Object.keys(POPUP_LOCALES.en.translation).sort()
  const zhKeys = Object.keys(POPUP_LOCALES.zh_CN.translation).sort()

  it('en 与 zh_CN 键集合一致', () => {
    expect(zhKeys).toEqual(enKeys)
  })

  it('所有键均有非空译文', () => {
    for (const key of enKeys as PopupTranslationKey[]) {
      expect(POPUP_LOCALES.en.translation[key].trim().length).toBeGreaterThan(0)
      expect(POPUP_LOCALES.zh_CN.translation[key].trim().length).toBeGreaterThan(0)
    }
  })

  it('zh 用户可见标签与 en 不同（除白名单）', () => {
    const allowed = new Set<string>(POPUP_ZH_EN_SAME_ALLOWED)
    for (const key of POPUP_USED_TRANSLATION_KEYS) {
      if (allowed.has(key)) continue
      expect(POPUP_LOCALES.zh_CN.translation[key]).not.toBe(POPUP_LOCALES.en.translation[key])
    }
  })
})

describe('popup language resolution', () => {
  it('normalizePopupLanguage 识别 zh-CN / zh_CN', () => {
    expect(normalizePopupLanguage('zh-CN')).toBe('zh_CN')
    expect(normalizePopupLanguage('zh_CN')).toBe('zh_CN')
    expect(normalizePopupLanguage('zh')).toBe('zh_CN')
    expect(normalizePopupLanguage('en-US')).toBe('en')
  })

  it('浏览器中文 UI 默认 zh_CN', () => {
    expect(defaultPopupLanguageFromBrowser()).toBe('zh_CN')
  })

  it('storage 优先于浏览器', () => {
    expect(resolvePopupLanguage('en')).toBe('en')
    expect(resolvePopupLanguage('zh_CN')).toBe('zh_CN')
  })
})
