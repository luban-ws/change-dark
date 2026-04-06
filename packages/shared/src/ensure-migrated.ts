import {
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SCHEMA_VERSION,
} from './constants'
import { planStorageMigration } from './migration'

const MIGRATION_READ_KEYS = [
  STORAGE_KEY_SCHEMA_VERSION,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_ENABLED,
] as const

/**
 * 在后台序列化执行一次迁移：写入 policy/schema，并移除遗留 `change-dark:enabled`。
 * 可重复调用；无变更时不写盘。
 */
export async function ensureStorageMigrated(): Promise<void> {
  const snap = await chrome.storage.local.get([...MIGRATION_READ_KEYS])
  const plan = planStorageMigration(snap as Record<string, unknown>)

  if (!plan.needsWrite) return

  await chrome.storage.local.set({
    [STORAGE_KEY_SCHEMA_VERSION]: plan.targetSchemaVersion,
    [STORAGE_KEY_POLICY]: plan.targetPolicy,
  })

  if (plan.removeLegacyEnabled) {
    await chrome.storage.local.remove(STORAGE_KEY_ENABLED)
  }
}
