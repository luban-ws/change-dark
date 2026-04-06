import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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
          globalSwitch: 'Global Switch',
          themeMode: 'Theme Mode',
          pagePalette: 'Page Palette',
          filters: 'Theme Filters',
          typography: 'Typography & Stroke',
          customCss: 'Site Custom CSS',
          siteList: 'Site List',
          supportTitle: 'Support the Author',
          supportHelp: 'If this extension helps you, consider buying me a coffee.',
          supportBtn: 'Support on Buy Me a Coffee'
        }
      },
      zh_CN: {
        translation: {
          extName: '嫦娥',
          extSubtitle: '强制暗色 · 在此调整全局策略、主题与站点规则',
          tabSettings: '设置',
          tabSupport: '支持',
          globalSwitch: '全局开关',
          themeMode: '主题模式',
          pagePalette: '页面配色',
          filters: '主题滤镜',
          typography: '字体与描边',
          customCss: '每站自定义 CSS',
          siteList: '站点列表',
          supportTitle: '支持作者',
          supportHelp: '若本扩展对你有帮助，可扫码或点击下方链接在 Buy Me a Coffee 上支持维护。',
          supportBtn: '在 Buy Me a Coffee 上支持'
        }
      }
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
