import { STORAGE_KEY_ENABLED } from './constants'

/** 读取是否启用暗色模式，默认开启以便开箱可用。 */
export async function readEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get(STORAGE_KEY_ENABLED)
  const v = stored[STORAGE_KEY_ENABLED]
  if (typeof v === 'boolean') return v
  return true
}
