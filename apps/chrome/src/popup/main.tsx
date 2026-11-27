import { startPopupPrefetch } from './popup-prefetch'

function detectBootZh(): boolean {
  try {
    const cached = globalThis.localStorage?.getItem('cd_popup_lang_v1')
    if (cached === 'zh_CN') return true
    if (cached === 'en') return false
  } catch {
    /* ignore */
  }
  try {
    const ui = typeof chrome !== 'undefined' ? (chrome.i18n?.getUILanguage?.() ?? '') : ''
    return ui.toLowerCase().startsWith('zh')
  } catch {
    return false
  }
}

const isZh = detectBootZh()

function setBootText(id: string, text: string): void {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

setBootText('cd-boot-title', isZh ? '嫦娥' : 'Selena')
setBootText('cd-boot-sub', isZh ? '强制暗色 · 正在初始化设置' : 'Force dark · Initializing settings')
setBootText('cd-boot-status', isZh ? '正在读取配置…' : 'Loading settings…')

startPopupPrefetch()

let uiStarted = false

function bootPopupUi(): void {
  if (uiStarted) return
  uiStarted = true
  setBootText('cd-boot-status', isZh ? '正在加载界面组件…' : 'Loading interface…')
  void import('./mount-app')
    .then(({ mountPopupApp }) => {
      setBootText('cd-boot-status', isZh ? '正在渲染界面…' : 'Rendering controls…')
      mountPopupApp()
    })
    .catch(() => {
      setBootText('cd-boot-status', isZh ? '界面加载失败，请重试' : 'Failed to load popup UI')
    })
}

// 让浏览器先完成极轻量 shell 的 onload 与首帧绘制（spinner 立即可见），再异步加载 React/Radix chunk。
if (document.readyState === 'complete') {
  requestAnimationFrame(bootPopupUi)
} else {
  window.addEventListener(
    'load',
    () => {
      requestAnimationFrame(bootPopupUi)
    },
    { once: true },
  )
}
