# RFC 012 — 主题模式：Dynamic（T-024）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-024** |
| 参考 | [Dark Reader Help — Dynamic mode](https://darkreader.org/help/en/) |

依赖：[005](./005-wasm-batch-color-api.md)、[006](./006-content-script-sampling-budget-fallback.md)、[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

**Dynamic** 路径：对页面样式与可视元素做较深分析，生成较自然的暗色主题（Help：效果最好、首屏资源中等）。工程实现落在 RFC 005/006；本 RFC 锁定 **产品行为、模式开关与验收口径**。

## Goals

1. 用户可在模式中选择 `dynamic`（具体 UI 见 [RFC 007](./007-popup-options-minimal-ui.md) 扩展）。
2. 与 Static/Filter 模式互斥；切换时清理旧注入痕迹。
3. 验收：若干基准站点截图对比清单（人工）。

## Non-goals

- SVG/Canvas 内联全量解析（可作为后续增强）。

## Risks

| 风险 | 缓解 |
|------|------|
| 性能 | RFC 006 预算 |
| 错色 | 回退 Static（[RFC 015](./015-theme-mode-static.md)） |

## Testing

- 单测覆盖颜色映射纯函数；浏览器手工矩阵。

## Decision log

- 2026-03-29：独立 RFC。
