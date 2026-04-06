import { describe, expect, it } from 'vitest'

import {
  POLICY_AUTO,
  POLICY_OFF,
  POLICY_ON,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_POLICY,
} from '../constants'
import { resolveApplyDarkFromPolicy, resolvePolicyFromSnapshot } from '../migration'

/**
 * 与内容脚本一致：由单次 storage 快照推导是否应注入强制暗色（RFC 008 验收用纯函数链）。
 */
function shouldInjectForcedDarkFromSnapshot(snapshot: Record<string, unknown>): boolean {
  return resolveApplyDarkFromPolicy(resolvePolicyFromSnapshot(snapshot))
}

describe('RFC 008 — 全局 policy → 是否注入', () => {
  it('policy=off → 不注入', () => {
    expect(shouldInjectForcedDarkFromSnapshot({ [STORAGE_KEY_POLICY]: POLICY_OFF })).toBe(false)
    expect(resolveApplyDarkFromPolicy(POLICY_OFF)).toBe(false)
  })

  it('policy=on / auto → 注入（auto 暂同 on）', () => {
    expect(shouldInjectForcedDarkFromSnapshot({ [STORAGE_KEY_POLICY]: POLICY_ON })).toBe(true)
    expect(shouldInjectForcedDarkFromSnapshot({ [STORAGE_KEY_POLICY]: POLICY_AUTO })).toBe(true)
  })

  it('遗留 enabled:false → 等价 off，不注入', () => {
    expect(shouldInjectForcedDarkFromSnapshot({ [STORAGE_KEY_ENABLED]: false })).toBe(false)
  })

  it('遗留 enabled:true → 注入', () => {
    expect(shouldInjectForcedDarkFromSnapshot({ [STORAGE_KEY_ENABLED]: true })).toBe(true)
  })
})
