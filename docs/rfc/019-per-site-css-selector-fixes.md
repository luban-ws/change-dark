# RFC 019 — 每站 CSS 选择器修复（Dev tools 类）（T-031）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-031** |
| 参考 | [Dark Reader Help — Developer tools](https://darkreader.org/help/en/) |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)、[012](./012-theme-mode-dynamic.md) 等

## Summary

高级用户可为 **单个站点** 追加自定义 CSS 片段（选择器级修复），类似 Dark Reader Dev tools；必须防止 **存储注入式 XSS** 与用户误伤全站。

## Goals

1. 存储：per-origin 字符串 + 版本；大小上限。
2. 注入：内容脚本在 **shadow/iframe 策略** 下文档化副作用。
3. 导出/导入 JSON（可选）时校验 schema。

## Non-goals

- 不提供共享「官方补丁库」流水线。

## Risks

| 风险 | 缓解 |
|------|------|
| 用户粘贴恶意内容仅在自体扩展上下文执行但仍可能破坏页面 | 警告文案 + 审阅模式 |

## Testing

- 解析/校验单测；手工对已知问题站。

## Decision log

- 2026-03-29：独立 RFC。
