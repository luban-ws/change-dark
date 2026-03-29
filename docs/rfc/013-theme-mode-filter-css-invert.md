# RFC 013 — 主题模式：Filter（CSS 反相）（T-025）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
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

## Decision log

- 2026-03-29：独立 RFC。
