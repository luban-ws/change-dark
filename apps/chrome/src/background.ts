import { STORAGE_KEY_ENABLED } from './shared/constants'

/** 安装时写入默认启用状态，避免 undefined 语义不清。 */
chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.get(STORAGE_KEY_ENABLED).then((cur) => {
    if (typeof cur[STORAGE_KEY_ENABLED] === 'boolean') return
    void chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: true })
  })
})
