import { describe, expect, it } from 'vitest'

import { POLICY_AUTO, POLICY_OFF, POLICY_ON } from './constants'
import { policyAfterGlobalHotkeyToggle } from './global-policy-toggle'

describe('policyAfterGlobalHotkeyToggle', () => {
  it('off → on', () => {
    expect(policyAfterGlobalHotkeyToggle(POLICY_OFF)).toBe(POLICY_ON)
  })

  it('on / auto → off', () => {
    expect(policyAfterGlobalHotkeyToggle(POLICY_ON)).toBe(POLICY_OFF)
    expect(policyAfterGlobalHotkeyToggle(POLICY_AUTO)).toBe(POLICY_OFF)
  })
})
