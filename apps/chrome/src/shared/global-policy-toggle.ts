import { POLICY_OFF, POLICY_ON, type GlobalPolicy } from './constants'

/**
 * 快捷键「全局开关」：在 on/auto 与 off 之间切换（与 Dark Reader 类「一键开关」一致）。
 * `auto` 视为「开」侧，下一次切到 `off`。
 */
export function policyAfterGlobalHotkeyToggle(current: GlobalPolicy): GlobalPolicy {
  if (current === POLICY_OFF) return POLICY_ON
  return POLICY_OFF
}
