# RFC 015 — 主题模式：Static（T-027）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-027** |
| 参考 | [Dark Reader Help — Static mode](https://darkreader.org/help/en/) |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

**Static**：快速生成 **基础暗色样式表**（Help），作为默认轻路径、Dynamic **超预算/异常** 回退（[RFC 006](./006-content-script-sampling-budget-fallback.md)）、以及低端机选项。

## Goals

1. 注入最小 CSS 集：`color-scheme`、根背景/前景、常见排版元素。
2. 与 Dynamic 切换时不残留矛盾规则。
3. 与 [RFC 011](./011-theme-filter-sliders.md) 组合时定义是否忽略复杂 filter（文档选择一种）。

## Non-goals

- 不全量重置站点自定义 CSS。

## Risks

| 风险 | 缓解 |
|------|------|
| 站点仍刺眼 | 用户改选 Dynamic |

## Testing

- Vitest：静态 CSS 生成纯函数；快照。

## Decision log

- 2026-03-29：独立 RFC。
