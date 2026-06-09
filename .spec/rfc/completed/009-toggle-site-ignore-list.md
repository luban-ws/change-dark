# RFC 009 — Toggle site 与忽略列表（T-021）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-021** |
| 参考 | [Dark Reader Help — Toggle site / Site list](https://darkreader.org/help/en/) |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)、[017](./017-site-list-patterns-regex.md)（列表模型）

## Summary

提供 **一键将当前站点加入/移出忽略列表**（Dark Reader 的 Toggle site）；与站点列表存储结构一致，避免重复真源。

## Goals

1. Popup 或快捷键（[RFC 010](./010-extension-hotkeys.md)）可触发 `toggleCurrentOrigin()`。
2. 忽略后当前标签立即还原外观。
3. 存储格式与 [RFC 017](./017-site-list-patterns-regex.md) 的 `SiteListStateV2`（模式 + `entries`）一致；Toggle 只读写 **精确 origin** 行。

## Non-goals

- 不在本 RFC 定义完整 pattern 语法（属 RFC 017）。

## Risks

| 风险 | 缓解 |
|------|------|
| `chrome://` 页无 tab URL | 按钮禁用 + 文案 |

## Testing

- 纯函数：origin 归一化（strip path）。
- 手工：多子域场景。

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 存储键 | `change-dark:site-list` → `SiteListStateV2`（`v: 2`，`mode`，`entries`），详见 [RFC 017](./017-site-list-patterns-regex.md) |
| 归一化 | `normalizeHttpOriginFromUrl`：仅 `http`/`https` 的 `URL.origin`；否则 Popup 禁用切换 |
| 内容脚本 | `readShouldApplyForcedDarkForPage()`：全局允许 **且** `shouldApplyForcedDarkFromSiteList(location.origin, state)` 为真才注入 |
| Popup | **Toggle site**：`toggleDenylistOrigin` 在当前 `mode` 下对 `entries` 增删精确 origin；多行规则与模式由 RFC 017 UI 编辑；`storage.onChanged` 刷新 |
| 快捷键 | `toggleCurrentOriginInDenylist(origin)` 供 **RFC 010** 复用 |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved；匹配为 **精确 origin**，pattern/正则留待 RFC 017。
- 2026-03-29：RFC 017 落地后，存储与注入真源统一为 `SiteListStateV2` + `shouldApplyForcedDarkFromSiteList`；本 RFC 表格已同步。
