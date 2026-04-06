import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const STORAGE_KEY_LANG = 'ui_language'

i18n
  .use(initReactI18next)
  .init({
    lng: chrome.i18n.getUILanguage()?.startsWith('zh') ? 'zh_CN' : 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          extName: 'Selena',
          extSubtitle: 'Force dark · Adjust global rules and site themes here',
          tabSettings: 'Settings',
          tabSupport: 'Support',
          lblCurrentSite: 'Current Site',
          lblNoOrigin: 'Open a web page to enable site rules.',
          lblSiteForced: 'This site is forced dark by site list rules.',
          lblSiteNotForced: 'This site follows global dark mode rules.',
          globalSwitch: 'Global Switch',
          lblAuto: 'Auto',
          lblOn: 'On',
          lblOff: 'Off',
          lblThreshold: 'Auto-Dark Threshold',
          lblStrict: 'Strict',
          lblRelaxed: 'Relaxed',
          lblScopeGlobal: 'Global',
          lblScopeSite: 'This Site',
          themeMode: 'Theme Mode',
          pagePalette: 'Page Palette',
          lblFxGate: 'Firefox N/A',
          filters: 'Theme Filters',
          typography: 'Typography & Stroke',
          customCss: 'Site Custom CSS',
          siteList: 'Site List',
          supportTitle: 'Support the Author',
          supportHelp: 'If this extension helps you, consider buying me a coffee.',
          supportBtn: 'Support on Buy Me a Coffee',
        }
      },
      zh_CN: {
        translation: {
          extName: '嫦娥',
          extSubtitle: '强制暗色 · 在此调整全局策略、主题与站点规则',
          tabSettings: '设置',
          tabSupport: '支持',
          lblCurrentSite: '当前站点',
          lblNoOrigin: '请打开网页以启用站点规则',
          lblSiteForced: '该站点已由站点列表规则强制暗色',
          lblSiteNotForced: '该站点遵循全局暗色模式规则',
          globalSwitch: '全局开关',
          lblAuto: '自动',
          lblOn: '开启',
          lblOff: '关闭',
          lblThreshold: '智能暗色阈值',
          lblStrict: '严格',
          lblRelaxed: '宽松',
          lblScopeGlobal: '全局',
          lblScopeSite: '仅当前网站',
          themeMode: '主题模式',
          pagePalette: '页面配色',
          lblFxGate: 'Firefox 不支持',
          filters: '主题滤镜',
          typography: '字体与描边',
          customCss: '每站自定义 CSS',
          siteList: '站点列表',
          supportTitle: '支持作者',
          supportHelp: '若本扩展对你有帮助，可扫码或点击下方链接在 Buy Me a Coffee 上支持维护。',
          supportBtn: '在 Buy Me a Coffee 上支持',
        }
      }
    },
    interpolation: { escapeValue: false }
  });

// Restore persisted language preference from storage (overrides browser locale default)
chrome.storage.local.get(STORAGE_KEY_LANG).then((result) => {
  const saved = result[STORAGE_KEY_LANG] as string | undefined
  if (saved && saved !== i18n.language) {
    void i18n.changeLanguage(saved)
  }
})

export { STORAGE_KEY_LANG }
export default i18n;


