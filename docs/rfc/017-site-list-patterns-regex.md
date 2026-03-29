# RFC 017 — 站点列表：模式、正则与两种列表逻辑（T-029）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-029** |
| 参考 | [Dark Reader Help — Site list](https://darkreader.org/help/en/) |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

实现 Help 中的 **Invert listed only** 与 **Not invert listed** 两类逻辑；支持 `google.*` 形式与 **斜杠包围的正则**；与 Toggle site（[RFC 009](./009-toggle-site-ignore-list.md)）写入同一抽象模型。

## Goals

1. 匹配入口：`host` + 规则列表 → boolean；纯函数可单测。
2. **ReDoS** 防护：超时、长度上限、或有限 glob 子集优先于全 regex。
3. Options UI 展示列表与模式切换（可依附 [RFC 007](./007-popup-options-minimal-ui.md)）。

## Non-goals

- 不在本 RFC 做云共享列表。

## Risks

| 风险 | 缓解 |
|------|------|
| 用户正则灾难 | 文档示例 + 限制 |

## Testing

- Vitest：`apps/chrome/src/shared/site-list.test.ts` — 迁移、`glob`、斜杠正则、`shouldApplyForcedDarkFromSiteList`、`toggleDenylistOrigin`。

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 模型 | `SiteListStateV2`：`v: 2`，`mode`（`not-invert-listed` \| `invert-listed-only`），`entries: string[]`；`MAX_SITE_LIST_ENTRIES = 200` |
| 匹配 | 精确 `https://` origin、hostname、段内 `*` 的 glob、`/pattern/flags` 正则；`shouldApplyForcedDarkFromSiteList(origin, state)` 为注入真源 |
| 迁移 | `parseSiteListState`：遗留 `{ denylist: string[] }` → `not-invert-listed` + `entries`（去重截断） |
| 存储 | `readSiteListState` / `persistSiteListState`；`readShouldApplyForcedDarkForPage` 使用 `shouldApplyForcedDarkFromSiteList` |
| Popup | `#site-list-textarea`、`input[name="site-list-mode"]`：模式单选 + 多行规则；`loadSiteListPanel` / `persistSiteListFromPanel` / `wireSiteListPanel`；快捷键 Toggle site 仍经 `toggleDenylistOrigin` 写精确 origin |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved（Popup 列表 UI + 共享匹配与单测）。
