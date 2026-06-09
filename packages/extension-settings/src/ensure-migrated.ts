import {
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SCHEMA_VERSION,
  STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_THEME_MODE,
  THEME_MODE_DYNAMIC,
} from './constants'
import { planStorageMigration } from './migration'

const MIGRATION_READ_KEYS = [
  STORAGE_KEY_SCHEMA_VERSION,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_THEME_MODE,
  STORAGE_KEY_SITE_OVERRIDES,
] as const

/**
 * 在后台序列化执行一次迁移：写入 policy/schema/theme-mode，清理遗留键与 site `themeMode`。
 * 可重复调用；无变更时不写盘。
 */
export async function ensureStorageMigrated(): Promise<void> {
  const snap = await chrome.storage.local.get([...MIGRATION_READ_KEYS])
  const plan = planStorageMigration(snap as Record<string, unknown>)

  if (!plan.needsWrite) return

  const payload: Record<string, unknown> = {
    [STORAGE_KEY_SCHEMA_VERSION]: plan.targetSchemaVersion,
    [STORAGE_KEY_POLICY]: plan.targetPolicy,
  }

  if (plan.writeThemeMode) {
    payload[STORAGE_KEY_THEME_MODE] = THEME_MODE_DYNAMIC
  }

  if (plan.siteOverridesChanged && plan.siteOverrides) {
    payload[STORAGE_KEY_SITE_OVERRIDES] = plan.siteOverrides
  }

  await chrome.storage.local.set(payload)

  if (plan.removeLegacyEnabled) {
    await chrome.storage.local.remove(STORAGE_KEY_ENABLED)
  }
}
