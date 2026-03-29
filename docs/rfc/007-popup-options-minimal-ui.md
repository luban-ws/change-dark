# RFC 007 — Popup / Options 最小 UI（T-013）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
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
- Vitest：`persistGlobalPolicy` 对 `chrome.storage.local.set/remove` 的调用（mock）。

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 清单 | `action.default_popup` → `src/popup/index.html`（`default_title`） |
| UI | `fieldset` + `legend` + 单选「自动 / 开启 / 关闭」；`popup.css` 暗色主题与 `:focus-visible` / `focus-within` |
| 写入 | `persistGlobalPolicy`（`shared/storage.ts`）：写 `change-dark:policy` + schema，并 `remove` 遗留 `enabled` |
| 同步 | `chrome.storage.onChanged` 更新单选状态（多窗口一致） |
| 当前站豁免 | 占位按钮 `disabled` + 说明文案，待 **RFC 009** |
| WASM | 未引入 popup（符合 Non-goals） |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved；首版仅 `action` popup，未加独立 `options_page`（可后续渐进）。
