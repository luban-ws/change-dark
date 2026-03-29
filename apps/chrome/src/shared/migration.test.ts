import { describe, expect, it } from 'vitest'

import {
  POLICY_AUTO,
  POLICY_OFF,
  POLICY_ON,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SCHEMA_VERSION,
} from './constants'
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  parseGlobalPolicy,
  planStorageMigration,
  resolveApplyDarkFromPolicy,
  resolvePolicyFromSnapshot,
} from './migration'

describe('parseGlobalPolicy', () => {
  it('接受三种合法字面量', () => {
    expect(parseGlobalPolicy(POLICY_ON)).toBe(POLICY_ON)
    expect(parseGlobalPolicy(POLICY_OFF)).toBe(POLICY_OFF)
    expect(parseGlobalPolicy(POLICY_AUTO)).toBe(POLICY_AUTO)
  })

  it('拒绝未知字符串', () => {
    expect(parseGlobalPolicy('yes')).toBeNull()
    expect(parseGlobalPolicy('')).toBeNull()
    expect(parseGlobalPolicy(1)).toBeNull()
  })
})

describe('resolvePolicyFromSnapshot', () => {
  it('空快照默认为 on', () => {
    expect(resolvePolicyFromSnapshot({})).toBe(POLICY_ON)
  })

  it('合法 policy 优先于遗留 enabled', () => {
    expect(
      resolvePolicyFromSnapshot({
        [STORAGE_KEY_POLICY]: POLICY_OFF,
        [STORAGE_KEY_ENABLED]: true,
      }),
    ).toBe(POLICY_OFF)
  })

  it('无 policy 时映射遗留 enabled', () => {
    expect(resolvePolicyFromSnapshot({ [STORAGE_KEY_ENABLED]: false })).toBe(POLICY_OFF)
    expect(resolvePolicyFromSnapshot({ [STORAGE_KEY_ENABLED]: true })).toBe(POLICY_ON)
  })
})

describe('resolveApplyDarkFromPolicy', () => {
  it('off 为 false，其余为 true（含 auto 暂同 on）', () => {
    expect(resolveApplyDarkFromPolicy(POLICY_OFF)).toBe(false)
    expect(resolveApplyDarkFromPolicy(POLICY_ON)).toBe(true)
    expect(resolveApplyDarkFromPolicy(POLICY_AUTO)).toBe(true)
  })
})

describe('planStorageMigration', () => {
  it('空存储需写入 on + schema', () => {
    const plan = planStorageMigration({})
    expect(plan.targetPolicy).toBe(POLICY_ON)
    expect(plan.targetSchemaVersion).toBe(CURRENT_STORAGE_SCHEMA_VERSION)
    expect(plan.needsWrite).toBe(true)
    expect(plan.removeLegacyEnabled).toBe(false)
  })

  it('仅遗留 enabled:false 写入 off 并移除遗留键', () => {
    const plan = planStorageMigration({ [STORAGE_KEY_ENABLED]: false })
    expect(plan.targetPolicy).toBe(POLICY_OFF)
    expect(plan.needsWrite).toBe(true)
    expect(plan.removeLegacyEnabled).toBe(true)
  })

  it('已规范化且无遗留键则无需写盘', () => {
    const plan = planStorageMigration({
      [STORAGE_KEY_SCHEMA_VERSION]: CURRENT_STORAGE_SCHEMA_VERSION,
      [STORAGE_KEY_POLICY]: POLICY_ON,
    })
    expect(plan.needsWrite).toBe(false)
    expect(plan.removeLegacyEnabled).toBe(false)
  })

  it('已规范化但仍有遗留 enabled 需清理', () => {
    const plan = planStorageMigration({
      [STORAGE_KEY_SCHEMA_VERSION]: CURRENT_STORAGE_SCHEMA_VERSION,
      [STORAGE_KEY_POLICY]: POLICY_ON,
      [STORAGE_KEY_ENABLED]: true,
    })
    expect(plan.needsWrite).toBe(true)
    expect(plan.removeLegacyEnabled).toBe(true)
  })

  it('非法 policy 字符串按回落逻辑纠正并写盘', () => {
    const plan = planStorageMigration({
      [STORAGE_KEY_POLICY]: 'bogus',
      [STORAGE_KEY_ENABLED]: false,
    })
    expect(plan.targetPolicy).toBe(POLICY_OFF)
    expect(plan.needsWrite).toBe(true)
  })
})
