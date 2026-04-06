import {
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SCHEMA_VERSION,
  POLICY_AUTO,
  POLICY_OFF,
  POLICY_ON,
  type GlobalPolicy,
} from './constants'

/** 当前存储 schema；与 `STORAGE_KEY_SCHEMA_VERSION` 写入值一致。 */
export const CURRENT_STORAGE_SCHEMA_VERSION = 1 as const

const POLICY_VALUES: readonly GlobalPolicy[] = [POLICY_AUTO, POLICY_ON, POLICY_OFF]

/**
 * 判断是否为合法的全局策略字面量（供存储与迁移使用）。
 */
export function parseGlobalPolicy(value: unknown): GlobalPolicy | null {
  return POLICY_VALUES.includes(value as GlobalPolicy) ? (value as GlobalPolicy) : null
}

/**
 * 从单次 `chrome.storage.local.get` 的快照解析「当前应采用」的全局策略（读路径）。
 * 优先级：`change-dark:policy` 合法值 > 遗留 `change-dark:enabled` > 默认 `on`。
 */
export function resolvePolicyFromSnapshot(snapshot: Record<string, unknown>): GlobalPolicy {
  const fromPolicy = parseGlobalPolicy(snapshot[STORAGE_KEY_POLICY])
  if (fromPolicy) return fromPolicy
  const legacy = snapshot[STORAGE_KEY_ENABLED]
  if (typeof legacy === 'boolean') return legacy ? POLICY_ON : POLICY_OFF
  return POLICY_ON
}

/**
 * 是否应对页面应用强制暗色（内容脚本 / 注入决策）。
 * **RFC 008**：`off` → 不注入并拆除；`on`/`auto` → 注入（`auto` 在系统主题 RFC 落地前暂同 `on`）。
 */
export function resolveApplyDarkFromPolicy(policy: GlobalPolicy): boolean {
  if (policy === POLICY_OFF) return false
  return true
}

/**
 * RFC 008 别名：与 `resolveApplyDarkFromPolicy` 相同，强调「全局开关」语义。
 */
export function shouldInjectForcedDarkStyles(policy: GlobalPolicy): boolean {
  return resolveApplyDarkFromPolicy(policy)
}

export interface StorageMigrationPlan {
  /** 规范化后应持久化的策略 */
  targetPolicy: GlobalPolicy
  /** 应写入的 schema 版本 */
  targetSchemaVersion: number
  /** 是否需要 `storage.local.set` 写入 policy/schema */
  needsWrite: boolean
  /** 是否在写入后移除遗留键 */
  removeLegacyEnabled: boolean
}

/**
 * 根据当前快照生成迁移计划；供后台单次执行与 Vitest 断言。
 */
export function planStorageMigration(snapshot: Record<string, unknown>): StorageMigrationPlan {
  const targetPolicy = resolvePolicyFromSnapshot(snapshot)
  const targetSchemaVersion = CURRENT_STORAGE_SCHEMA_VERSION
  const storedPolicy = parseGlobalPolicy(snapshot[STORAGE_KEY_POLICY])
  const rawSchema = snapshot[STORAGE_KEY_SCHEMA_VERSION]
  const storedSchema = typeof rawSchema === 'number' && Number.isFinite(rawSchema) ? rawSchema : 0
  const hasLegacyEnabled = typeof snapshot[STORAGE_KEY_ENABLED] === 'boolean'

  const schemaOk = storedSchema >= targetSchemaVersion
  const policyOk = storedPolicy === targetPolicy
  const needsWrite = !schemaOk || !policyOk || hasLegacyEnabled

  return {
    targetPolicy,
    targetSchemaVersion,
    needsWrite,
    removeLegacyEnabled: hasLegacyEnabled,
  }
}
