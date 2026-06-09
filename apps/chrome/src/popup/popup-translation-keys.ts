import type { PopupTranslationKey } from './i18n'

/** 组件内实际引用的文案键（与 i18n.ts 保持同步）。 */
export const POPUP_USED_TRANSLATION_KEYS = [
  'extName',
  'extSubtitle',
  'tabSettings',
  'tabSupport',
  'lblLangZh',
  'lblLangEn',
  'lblCurrentSite',
  'lblNoOrigin',
  'lblSiteForced',
  'lblSiteNotForced',
  'lblNoHostname',
  'globalSwitch',
  'lblAuto',
  'lblOn',
  'lblOff',
  'lblThreshold',
  'lblStrict',
  'lblRelaxed',
  'lblScopeGlobal',
  'lblScopeSite',
  'lblClearSiteOverride',
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
  'lblSelectFont',
  'lblFontSystem',
  'lblFontSans',
  'lblFontSerif',
  'lblFontMono',
  'lblFontCustom',
  'lblFontFamilyPlaceholder',
  'lblEnableStroke',
  'customCss',
  'siteList',
  'lblSiteListBlacklist',
  'lblSiteListWhitelist',
  'lblSiteListPlaceholder',
  'supportTitle',
  'supportHelp',
  'altQrCode',
] as const satisfies readonly PopupTranslationKey[]

/** 中英文允许相同（专名、示例域名、语言名称等）。 */
export const POPUP_ZH_EN_SAME_ALLOWED: readonly PopupTranslationKey[] = [
  'lblLangZh',
  'lblNoHostname',
  'lblSiteListPlaceholder',
]

export type FontPresetValue = 'system' | 'sans' | 'serif' | 'mono' | 'custom'

export const FONT_PRESET_LABEL_KEYS: Record<FontPresetValue, PopupTranslationKey> = {
  system: 'lblFontSystem',
  sans: 'lblFontSans',
  serif: 'lblFontSerif',
  mono: 'lblFontMono',
  custom: 'lblFontCustom',
}
