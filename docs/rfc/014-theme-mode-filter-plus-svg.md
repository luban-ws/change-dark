# RFC 014 — 主题模式：Filter+（SVG filter）（T-026）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-026** |
| 参考 | [Dark Reader Help — Filter+ / Firefox](https://darkreader.org/help/en/) |

依赖：[013](./013-theme-mode-filter-css-invert.md)

## Summary

基于 **SVG `filter`** 的变体路径，色彩处理优于纯 CSS invert（Help）；Help 注明 **Firefox 上表现差** — 嫦娥实现须 **特性检测或仅 Chromium 暴露**。

## Goals

1. Chromium：可选模式；失败降级 Filter 或 Static。
2. Firefox（若未来支持）：默认隐藏或自动降级。
3. 性能与 Filter 同级警告。

## Non-goals

- 不追求跨浏览器像素一致。

## Risks

| 风险 | 缓解 |
|------|------|
| 兼容碎片化 | `document.createElementNS` 注入与 try/catch |

## Testing

- Chromium 手工；Firefox 验证降级分支。

## Decision log

- 2026-03-29：独立 RFC。
