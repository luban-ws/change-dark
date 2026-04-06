import {
  COMMAND_TOGGLE_CURRENT_SITE,
  COMMAND_TOGGLE_GLOBAL,
} from "@luban-ws/shared"
import { normalizeHttpOriginFromUrl } from "@luban-ws/shared"
import { ensureStorageMigrated } from "@luban-ws/shared"
import { policyAfterGlobalHotkeyToggle } from "@luban-ws/shared"
import {
  persistGlobalPolicy,
  readGlobalPolicy,
  toggleCurrentOriginInDenylist,
} from "@luban-ws/shared"

/** 安装、更新与浏览器启动时规范化存储（RFC 004）。 */
chrome.runtime.onInstalled.addListener(() => {
  void ensureStorageMigrated()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureStorageMigrated()
})

/** RFC 010：快捷键 → 全局 policy 或当前站站点列表（精确 origin 切换）。 */
chrome.commands.onCommand.addListener((command) => {
  if (command === COMMAND_TOGGLE_GLOBAL) {
    void (async () => {
      try {
        const cur = await readGlobalPolicy()
        await persistGlobalPolicy(policyAfterGlobalHotkeyToggle(cur))
      } catch {
        /* 静默失败，不打扰用户 */
      }
    })()
    return
  }

  if (command === COMMAND_TOGGLE_CURRENT_SITE) {
    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const url = tab?.url
        const origin = url ? normalizeHttpOriginFromUrl(url) : null
        if (!origin) return
        await toggleCurrentOriginInDenylist(origin)
      } catch {
        /* 忽略不可注入页等 */
      }
    })()
  }
})
