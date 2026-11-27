export const STORAGE_KEY_LANG = 'ui_language'
const LOCAL_CACHE_KEY_LANG = 'cd_popup_lang_v1'

export type PopupLanguage = 'en' | 'zh_CN'

/** Popup UI strings — single source for en / zh_CN. */
export const POPUP_LOCALES = {
  en: {
    translation: {
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
    },
  },
  zh_CN: {
    translation: {
      extName: '嫦娥',
      extSubtitle: '强制暗色 · 在此调整全局策略、主题与站点规则',
      tabSettings: '设置',
      tabSupport: '支持',
      lblLangZh: '中文',
      lblLangEn: '英文',
      lblCurrentSite: '当前站点',
      lblNoOrigin: '请打开网页以启用站点规则',
      lblSiteForced: '该站点已由站点列表规则强制暗色',
      lblSiteNotForced: '该站点遵循全局暗色模式规则',
      lblNoHostname: '—',
      globalSwitch: '全局开关',
      lblAuto: '自动',
      lblOn: '开启',
      lblOff: '关闭',
      lblThreshold: '智能暗色阈值',
      lblStrict: '严格',
      lblRelaxed: '宽松',
      lblScopeGlobal: '全局',
      lblScopeSite: '仅当前网站',
      lblClearSiteOverride: '清除本站覆盖',
      pagePalette: '页面配色',
      lblPaletteDark: '暗色',
      lblPaletteSolarized: 'Solarized 暗色',
      filters: '主题滤镜',
      lblBrightness: '亮度',
      lblContrast: '对比度',
      lblSepia: '褐色',
      lblSaturate: '饱和度',
      typography: '字体与描边',
      lblEnableFont: '覆盖字体',
      lblSelectFont: '选择字体…',
      lblFontSystem: '系统字体',
      lblFontSans: '无衬线',
      lblFontSerif: '衬线',
      lblFontMono: '等宽',
      lblFontCustom: '自定义…',
      lblFontFamilyPlaceholder: '字体族名称…',
      lblEnableStroke: '文字描边（0.01px–1px）',
      customCss: '本站自定义样式',
      siteList: '站点列表设置',
      lblSiteListBlacklist: '黑名单',
      lblSiteListWhitelist: '白名单',
      lblSiteListPlaceholder: 'example.com\ngithub.com',
      supportTitle: '支持作者',
      supportHelp: '若本扩展对你有帮助，欢迎扫码支持作者。',
      altQrCode: '支持二维码',
    },
  },
} as const

export type PopupTranslationKey = keyof typeof POPUP_LOCALES.en.translation

/** 归一化 storage / 浏览器语言到 popup 支持的 code。 */
export function normalizePopupLanguage(raw: unknown): PopupLanguage | undefined {
  if (raw === 'en' || raw === 'zh_CN') return raw
  if (typeof raw !== 'string') return undefined
  const lower = raw.toLowerCase().replace(/-/g, '_')
  if (lower === 'zh_cn' || lower.startsWith('zh')) return 'zh_CN'
  if (lower === 'en' || lower.startsWith('en')) return 'en'
  return undefined
}

/** 首次打开 popup 时的默认语言（storage 未写入时）。 */
export function defaultPopupLanguageFromBrowser(): PopupLanguage {
  const ui = typeof chrome !== 'undefined' ? (chrome.i18n?.getUILanguage?.() ?? '') : ''
  return normalizePopupLanguage(ui) ?? 'en'
}

/** storage 优先，否则跟随浏览器 UI 语言。 */
export function resolvePopupLanguage(saved: unknown): PopupLanguage {
  return normalizePopupLanguage(saved) ?? defaultPopupLanguageFromBrowser()
}

function readCachedPopupLanguage(): PopupLanguage | undefined {
  try {
    return normalizePopupLanguage(globalThis.localStorage?.getItem(LOCAL_CACHE_KEY_LANG))
  } catch {
    return undefined
  }
}

function writeCachedPopupLanguage(lng: PopupLanguage): void {
  try {
    globalThis.localStorage?.setItem(LOCAL_CACHE_KEY_LANG, lng)
  } catch {
    /* ignore */
  }
}

type LanguageListener = (lng: PopupLanguage) => void
const listeners = new Set<LanguageListener>()

const i18n = {
  /** 保持为可配置数据属性，兼容单测中 `Object.defineProperty(i18n, 'language', ...)`。 */
  language: readCachedPopupLanguage() ?? defaultPopupLanguageFromBrowser(),
  on(event: 'languageChanged', listener: LanguageListener): void {
    if (event === 'languageChanged') listeners.add(listener)
  },
  off(event: 'languageChanged', listener: LanguageListener): void {
    if (event === 'languageChanged') listeners.delete(listener)
  },
  changeLanguage(next: string): Promise<PopupLanguage> {
    const resolved = normalizePopupLanguage(next) ?? defaultPopupLanguageFromBrowser()
    i18n.language = resolved
    writeCachedPopupLanguage(resolved)
    for (const listener of listeners) {
      listener(resolved)
    }
    return Promise.resolve(resolved)
  },
}

export const i18nReady = Promise.resolve()

/** 将 `chrome.storage.local` 读出的语言值同步应用到内存与 `localStorage`，缺失时后台补写而不阻塞渲染。 */
export function applyPopupLanguageFromStorageValue(saved: unknown): PopupLanguage {
  const lng = resolvePopupLanguage(saved)
  writeCachedPopupLanguage(lng)
  if (saved === undefined && typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
    void chrome.storage.local.set({ [STORAGE_KEY_LANG]: lng }).catch(() => {})
  }
  if (normalizePopupLanguage(i18n.language) !== lng) {
    void i18n.changeLanguage(lng)
  }
  return lng
}

/** 从 storage 读取并应用语言（供单测或独立调用）。 */
export async function initPopupLanguageFromStorage(): Promise<PopupLanguage> {
  const result = await chrome.storage.local.get(STORAGE_KEY_LANG)
  return applyPopupLanguageFromStorageValue(result[STORAGE_KEY_LANG])
}

export default i18n
