# RFC 008 — 全局 On/Off（policy）（T-020）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-020** |
| 参考 | [Dark Reader Help — Top / On/Off](https://darkreader.org/help/en/) |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

实现与 Dark Reader 类似的 **全局扩展开关**：用户可完全关闭嫦娥；语义由 `policy` 表达，并与内容脚本是否注入样式一致。

## Goals

1. `off` 时内容脚本 **不注入** 或立即拆除已有注入。
2. 与 [RFC 007](./007-popup-options-minimal-ui.md) 开关控件绑定同一存储字段。
3. `auto` 若未定义行为，本 RFC 可暂定等同 `on` 直至系统主题检测 RFC 另立。

## Non-goals

- 系统 `prefers-color-scheme` 跟随可另开 RFC；此处仅预留 `auto` 枚举。

## Risks

| 风险 | 缓解 |
|------|------|
 Tab 缓存旧样式 | `storage.onChanged` 二次应用 |

## Testing

- Vitest：policy → 应注入布尔规则（纯函数层）。

## Decision log

- 2026-03-29：初稿。
