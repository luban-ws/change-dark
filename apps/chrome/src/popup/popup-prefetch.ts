export interface PopupPrefetchBatch {
  rawStoragePromise: Promise<Record<string, unknown>>
  activeTabPromise: Promise<chrome.tabs.Tab[]>
}

/**
 * 与 `@change-dark/extension-settings` `POPUP_STORAGE_KEYS` + `ui_language` 保持一致的键字面量。
 * 此处不静态导入 `@change-dark/extension-settings`，避免首屏 HTML 静态依赖 `storage-*.js`。
 */
const PREFETCH_STORAGE_KEYS = [
  'change-dark:schema-version',
  'change-dark:policy',
  'change-dark:enabled',
  'change-dark:theme-filters',
  'change-dark:page-palette',
  'change-dark:typography',
  'change-dark:site-list',
  'change-dark:site-overrides',
  'change-dark:site-custom-css',
  'change-dark:site-profile-patches',
  'change-dark:auto-dark-threshold',
  'ui_language',
] as const

let pendingPrefetch: PopupPrefetchBatch | null = null

/** 在 UI chunk 加载前同步发起唯一一次并行 IPC 预取（storage + active tab）。 */
export function startPopupPrefetch(): PopupPrefetchBatch | null {
  if (typeof chrome === 'undefined' || !chrome.storage?.local?.get || !chrome.tabs?.query) {
    return null
  }
  const rawStoragePromise = chrome.storage.local.get([
    ...PREFETCH_STORAGE_KEYS,
  ]) as Promise<Record<string, unknown>>
  const activeTabPromise = chrome.tabs.query({ active: true, currentWindow: true })
  pendingPrefetch = { rawStoragePromise, activeTabPromise }
  return pendingPrefetch
}

/** 消费首屏预取句柄（一次性，避免单测间状态串扰）。 */
export function consumePopupPrefetch(): PopupPrefetchBatch | null {
  const batch = pendingPrefetch
  pendingPrefetch = null
  return batch
}
