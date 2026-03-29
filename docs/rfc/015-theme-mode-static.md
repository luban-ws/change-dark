# RFC 015 — 主题模式：Static（T-027）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
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

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 路径 | 用户选 Static 或 Dynamic 超预算/异常回退仍用 `STATIC_FALLBACK_RGB` + WASM（既有逻辑）；Popup 选 Static 时走 `buildStaticDarkCss` |
| 最小集 | `buildDarkCss`（`color-scheme`、`:root` 变量、`html`/`body` 背景与字色）+ `buildStaticDarkCss` 追加 `:where(main, article, aside, section, nav, p, h1–h6, …)` 使用 `var(--cd-page-fg)` |
| RFC 011 | **不**在 Static 单独关闭滤镜：非中性时仍在 `html[data-change-dark-root]` 上挂 `filter`，与 Dynamic 一致，避免两套心智 |
| 互斥 | 仍单节点 `#change-dark-style` + `storage` 重绘，无残留矛盾规则 |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved；RFC 011 采用「与 Dynamic 相同根 filter」。
