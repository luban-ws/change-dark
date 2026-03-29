# RFC 007 — Popup / Options 最小 UI（T-013）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-013** |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

提供 **最小可用** 的扩展弹窗或选项页：全局开关（policy）、可选「当前站豁免」入口（与 [RFC 009](./009-toggle-site-ignore-list.md) 联动）；不承载重计算。

## Goals

1. MV3：`action.default_popup` 或全屏 `options_page` 二选或渐进支持。
2. UI 写入仅通过封装后的 storage API，键与 [RFC 004](./004-policy-storage-migration-from-enabled-boolean.md) 一致。
3. 无障碍：焦点环、语义标签。

## Non-goals

- 一次做齐所有滑块（见 [RFC 011](./011-theme-filter-sliders.md)）。
- 不嵌入 WASM 于 popup（计算仍在 content / background 约定路径）。

## Risks

| 风险 | 缓解 |
|------|------|
| 权限不足导致灰显 | 对齐 Help 中「页面不可注入」提示文案 |

## Testing

- 组件级测试（若引入框架）；否则手工清单。

## Decision log

- 2026-03-29：独立 RFC。
