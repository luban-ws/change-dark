import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      brand: '嫦娥 (Selena)',
      fullName: '嫦娥 (Selena)',
      tagline: 'Forced Dark · Global Policies, Themes, and Site Rules',
      heroDesc1: 'Chromium ',
      heroDesc2: 'Manifest V3',
      heroDesc3: ' extension: inject dark styles on any site. Color math runs in ',
      heroDesc4: 'Rust / WebAssembly',
      heroDesc5: ' for maximum performance.',
      viewRepo: 'View Repository',
      preview: 'Preview UI',
      install: 'User Guide',
      installTitle: 'How to Install & Update',
      install1: 'Build: Run pnpm install and pnpm run build in the source root.',
      install2: 'Load: Chrome → Extensions → Developer Mode → Load Unpacked.',
      install3: 'Locate: Select the apps/chrome/dist directory to install.',
      refreshTitle: 'Applying Changes',
      refreshDesc: 'After making code changes or rebuilding, visit chrome://extensions and click the "Reload" icon to sync updates immediately.',
      privacy: 'Privacy Policy',
      footer1: 'MIT License · Built by apps/site',
      overview: 'Overview',
      tech: 'Features',
      screenshot: 'UI',
      features: 'Capabilities',
      guide: 'Guide',
    }
  },
  zh: {
    translation: {
      brand: '嫦娥 (Selena)',
      fullName: '嫦娥 (Selena)',
      tagline: '强制暗色 · 在此调整全局策略、主题与站点规则',
      heroDesc1: 'Chromium ',
      heroDesc2: 'Manifest V3',
      heroDesc3: ' 扩展：在任意站点自动应用暗色样式；核心算法由 ',
      heroDesc4: 'Rust / WebAssembly',
      heroDesc5: ' 驱动，保证极致性能与低延迟。',
      viewRepo: '查看仓库',
      preview: '界面预览',
      install: '使用指南',
      techTitle: '系统特性',
      techDesc: '为现代浏览器深度优化，提供精细的站点控制与丰富的配色模式。',
      extensionTitle: '智能配色引擎',
      extensionBody: '智能采样页面背景与配色，在尊重原始设计逻辑的基础上进行暗色重塑。',
      rustTitle: '高性能内核',
      rustBody: '利用底层计算能力进行快速颜色分析，确保主线程在大流量页面下依然丝滑。',
      siteTitle: '尊重隐私',
      siteBody: '绝无任何追踪行为。所有站点配置、忽略列表与偏好设置均仅保留在本地。',
      screenshotTitle: '功能界面一览',
      screenshotDesc: '直观、优雅的设置面板，无论全局还是单个站点都能信手拈来。',
      featureTitle: '核心能力',
      featureLede: '提供暗色阅读体验所需的一切，掌握每一个像素。',
      featGlobalTitle: '全局管控',
      featGlobalBody: '一键开关或选择自动同步系统主题。支持随不同环境自动切换策略。',
      featSiteTitle: '按站配置',
      featSiteBody: '支持为特定域名设定专属模式，未配置的项将自动继承全局设置。',
      featThemeTitle: '多重模式',
      featThemeBody: '支持 Dynamic (动态配色), Static (静态基色) 与 Filter (滤镜) 模式。',
      featWasmTitle: '轻量且迅速',
      featWasmBody: '超小体积的原生性能，即使在复杂页面下也依然保持丝滑注入。',
      installTitle: '安装与更新指南',
      install1: '构建项目：在源码根目录执行 pnpm install 与 pnpm run build。',
      install2: '加载：打开 Chrome → 扩展程序 → 开启“开发者模式” → 点击“加载已解压的扩展程序”。',
      install3: '定位：选择目录 apps/chrome/dist 文件夹即可完成安装。',
      refreshTitle: '使改动生效',
      refreshDesc: '在修改代码或执行 Rebuild 后，请前往 chrome://extensions 页面点击插件下方的“刷新 (Reload)”按钮以同步最新改动。',
      privacy: '隐私政策',
      footer1: 'MIT License · 本页由 apps/site 构建',
      overview: '概览',
      tech: '特性',
      screenshot: '界面',
      features: '能力',
      guide: '指南',
    }
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh', // 默认中文
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
