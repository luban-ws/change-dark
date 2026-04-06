# RFC 013 — 主题模式：Filter（CSS 反相）（T-025）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-025** |
| 参考 | [Dark Reader Help — Filter mode issues](https://darkreader.org/help/en/) |

依赖：[011](./011-theme-filter-sliders.md)

## Summary

实现 **整页 CSS filter 反相** 路径，并对 `img`/`video`/部分元素做 **再反相** 还原；Help 提示的亚像素、性能问题须在 UI 标注与默认模式选择中体现。

## Goals

1. 适用「问题站点」回退或用户显式选择。
2. 与 [RFC 011](./011-theme-filter-sliders.md) 链式组合 filter 不冲突。
3. iframe / shadow DOM 边界行为文档化（最小可行）。

## Non-goals

- 不解决所有浏览器 filter bug（记录 Known issues）。

## Risks

| 风险 | 缓解 |
|------|------|
| 大页面卡顿 | 默认非 Filter；警告文案 |
| 已暗站点变亮 | 提示切换 Dynamic/Static |

## Testing

- 手工：视频、图片、canvas 页。

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 存储 | `change-dark:theme-mode` = `filter-css`（与 `dynamic` / `static` 互斥，见 RFC 012） |
| 根 `filter` | `FILTER_CSS_INVERT_CHAIN`（`invert(1) hue-rotate(180deg)`）+ 可选 RFC 011 链（接在反相链之后） |
| 媒体 | `img` / `picture` / `svg` / `video` / `canvas` 使用同链再反相，抵消整页反相对位图/矢量的大致观感 |
| 边界 | **iframe**：仅作用于 iframe 元素框；**跨域子文档**内无法注入，子页不受控。**shadow DOM**：继承宿主文档注入，封闭 shadow 内样式不由此表覆盖（最小可行） |
| Popup | 第三项「Filter（CSS 反相）」+ 性能/已暗站点/滤镜顺序/iframe 提示 |
| 实现 | `buildFilterInvertCss`（`css.ts`）；内容脚本 `THEME_MODE_FILTER_CSS` 分支无 WASM |

## Known issues

- 大页面整页 `filter` 可能卡顿（RFC Risks）；默认仍为 Dynamic。
- 已为暗色的站点在反相后可能变亮，需改回 Dynamic/Static。
- 与 RFC 011 非中性组合时，媒体再反相仅抵消基链，观感可能略有偏差。

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved。
