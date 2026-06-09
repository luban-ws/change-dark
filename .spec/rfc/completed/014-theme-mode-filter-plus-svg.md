# RFC 014 — 主题模式：Filter+（SVG filter）（T-026）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
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

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 存储 | `change-dark:theme-mode` = `filter-plus`（与 RFC 012/013 互斥） |
| SVG | `body` 末挂隐藏 `<svg><defs><filter id="cd-filter-plus-base">`：`feColorMatrix` 反相 + `feHueRotate` 180° |
| CSS | `buildFilterPlusCss(themeFilters?, pagePalette?)`：`resolveFilterCssInjectionScope` 与 RFC 013 一致；`filter: url(#cd-filter-plus-base) [RFC011 链]`；与 RFC 013 同集的 **媒体补偿**（`buildFilterInvertMediaSelectorList`，含 `audio`/`video`/`object`/`embed`/`iframe`/`[role="img"]` 等；`svg` 为 `svg:not(#change-dark-filter-plus-svg)`）再套 `url(#id)`；**Solarized** 时壳色在 `html`、`url(#…)` 在 `body` |
| 降级 | `navigator` 含 Firefox → 不暴露 Popup 单选，内容脚本走 RFC 013（**同一 `pagePalette`**）；`ensureFilterPlusSvg` 失败或异常 → 013 |
| 原生已暗 | 与 RFC 013：`auto` 全跳过；`on` 时不注入 Filter+（含降级 013） |
| Popup | 「Filter+（SVG）」；非 Chromium 系 UA 禁用并 `title` 说明 |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved。
- 2026-04-19：媒体补偿与 RFC 013 对齐（共用 `buildFilterInvertMediaSelectorList`）；见 [RFC 028](../rejected/028-theme-mode-filter-plus-refinement.md)。
- 2026-04-19：`buildFilterPlusCss` 接收 `pagePalette` 并与 RFC 013 共用 Solarized / 默认分支划分；降级到 CSS Filter 时同样传入 `pagePalette`。
