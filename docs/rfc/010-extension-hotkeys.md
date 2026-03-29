# RFC 010 — 扩展快捷键（T-022）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-022** |
| 参考 | [Dark Reader Help — hotkeys](https://darkreader.org/help/en/) |

依赖：[008](./008-global-on-off-policy.md)、[009](./009-toggle-site-ignore-list.md)

## Summary

通过 `chrome.commands` 注册快捷键：**全局开关**、**Toggle 当前站**，与 Help 中「快捷键配置」用户预期对齐（具体组合键遵循各 OS 冲突最小原则）。

## Goals

1. `manifest` 声明 `commands`；background 监听 `onCommand`。
2. 与用户可配置键位（Chrome 扩展快捷键页）兼容；默认键位文档化。
3. 不可注入页面不报错，静默 no-op 或 `notifications`（可选，非必须）。

## Non-goals

- 不在扩展内自建完整快捷键录制 UI（用浏览器自带绑定页）。

## Risks

| 风险 | 缓解 |
|------|------|
| 默认键冲突 | 选择少见组合 |

## Testing

- 手工：加载 unpacked 验证 `chrome://extensions/shortcuts`。

## Decision log

- 2026-03-29：独立 RFC。
