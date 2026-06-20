import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

vi.hoisted(() => {
  globalThis.chrome = {
    i18n: { getUILanguage: () => 'zh-CN' },
    storage: { local: { get: async () => ({}), set: async () => {} } },
  } as unknown as typeof chrome
})

import i18n, { POPUP_LOCALES, type PopupTranslationKey } from '../i18n'
import {
  POPUP_USED_TRANSLATION_KEYS,
  POPUP_ZH_EN_SAME_ALLOWED,
} from '../popup-translation-keys'

const POPUP_SRC_DIR = join(__dirname, '..')

function collectPopupSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue
      out.push(...collectPopupSourceFiles(full))
      continue
    }
    if (/\.(tsx|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** 从源码提取 t('key') / t("key") / t(FILTER_LABEL_KEYS[...]) 等静态键。 */
function extractStaticTKeysFromSources(): Set<string> {
  const keys = new Set<string>()
  const staticPattern = /\bt\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g
  for (const file of collectPopupSourceFiles(POPUP_SRC_DIR)) {
    const src = readFileSync(file, 'utf8')
    for (const match of src.matchAll(staticPattern)) {
      keys.add(match[1]!)
    }
  }
  return keys
}

describe('popup label audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POPUP_USED_TRANSLATION_KEYS 覆盖源码里所有静态 t(key)', () => {
    const fromSource = extractStaticTKeysFromSources()
    const declared = new Set<string>(POPUP_USED_TRANSLATION_KEYS)
    const missingInManifest = [...fromSource].filter((k) => !declared.has(k))
    expect(missingInManifest, `未登记: ${missingInManifest.join(', ')}`).toEqual([])
  })

  it('POPUP_USED 每个键在 en/zh 都存在', () => {
    for (const key of POPUP_USED_TRANSLATION_KEYS) {
      expect(POPUP_LOCALES.en.translation[key as PopupTranslationKey]).toBeTruthy()
      expect(POPUP_LOCALES.zh_CN.translation[key as PopupTranslationKey]).toBeTruthy()
    }
  })

  it('zh 用户可见标签不得与 en 相同（除白名单）', () => {
    const allowed = new Set<string>(POPUP_ZH_EN_SAME_ALLOWED)
    const offenders: string[] = []
    for (const key of POPUP_USED_TRANSLATION_KEYS) {
      if (allowed.has(key)) continue
      const en = POPUP_LOCALES.en.translation[key]
      const zh = POPUP_LOCALES.zh_CN.translation[key]
      if (en === zh) offenders.push(key)
    }
    expect(offenders, offenders.join(', ')).toEqual([])
  })

  it('i18n.language 为 zh-CN 时 normalize 后应出中文文案', async () => {
    await i18n.changeLanguage('zh_CN')
    Object.defineProperty(i18n, 'language', { value: 'zh-CN', configurable: true })
    const { normalizePopupLanguage } = await import('../i18n')
    expect(normalizePopupLanguage(i18n.language)).toBe('zh_CN')
    expect(POPUP_LOCALES[normalizePopupLanguage(i18n.language)!].translation.filters).toBe('主题滤镜')
  })
})
