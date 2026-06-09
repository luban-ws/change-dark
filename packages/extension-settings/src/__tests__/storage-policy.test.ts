import { afterEach, describe, expect, it, vi } from 'vitest'

import { POLICY_OFF, STORAGE_KEY_ENABLED, STORAGE_KEY_POLICY, STORAGE_KEY_SCHEMA_VERSION } from '../constants'
import { CURRENT_STORAGE_SCHEMA_VERSION } from '../migration'
import { persistGlobalPolicy } from '../storage'

describe('persistGlobalPolicy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('写入 policy + schema 并移除遗留 enabled', async () => {
    const set = vi.fn().mockResolvedValue(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('chrome', {
      storage: {
        local: { set, remove },
      },
    })

    await persistGlobalPolicy(POLICY_OFF)

    expect(set).toHaveBeenCalledWith({
      [STORAGE_KEY_POLICY]: POLICY_OFF,
      [STORAGE_KEY_SCHEMA_VERSION]: CURRENT_STORAGE_SCHEMA_VERSION,
    })
    expect(remove).toHaveBeenCalledWith(STORAGE_KEY_ENABLED)
  })
})
