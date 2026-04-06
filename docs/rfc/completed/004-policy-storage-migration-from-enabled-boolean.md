# RFC 004 — 策略存储与 `enabled` boolean 迁移（T-010）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-010** |

依赖：[001](./001-rust-wasm-monorepo-and-chrome-host.md)

## Summary

用可扩展的 **全局策略**（及后续 per-origin 结构）替代单一的 `change-dark:enabled` boolean；定义迁移路径与 `chrome.storage.local` 键名规范（单一常量模块出口）。

## Goals

1. 引入 `change-dark:policy`：`auto` | `on` | `off`（或等价枚举），并定义与现有 boolean 的读取兼容层直至迁移完成。
2. 预留 `change-dark:schema-version`、`change-dark:origin-overrides`、豁免列表键 shape（具体字段由 [RFC 009](./009-toggle-site-ignore-list.md)、[RFC 017](./017-site-list-patterns-regex.md) 消费）。
3. 后台/内容脚本读写路径统一，避免散落魔法字符串。

## Non-goals

- 不在本 RFC 实现 Popup UI（见 [RFC 007](./007-popup-options-minimal-ui.md)）。
- 不实现 pattern 匹配引擎（见 [RFC 017](./017-site-list-patterns-regex.md)）。

## Proposal（存储草案）

| 键 | 类型 | 说明 |
|----|------|------|
| `change-dark:schema-version` | number | 从 `1` 起 |
| `change-dark:policy` | `'auto' \| 'on' \| 'off'` | 全局主开关语义 |
| `change-dark:enabled` | boolean | **遗留**；迁移读入后写回 policy 并可删除 |

（实现时键名以 `constants` 为准；上表为设计讨论用。）

## Migration

1. 首次启动：若仅有 `enabled`，映射为 `policy= on/off`。
2. 写路径：新代码只写 `policy` + schema 版本。
3. 过渡期：读取同时检查 `enabled` 直至 major 版本移除。

## Risks

| 风险 | 缓解 |
|------|------|
| 竞态读写 | background 序列化迁移；`onChanged` 广播一次 |

## Testing

- Vitest：迁移纯函数（旧存储快照 → 新 shape）。
- 手工：加载扩展前后 storage 面板核对。

## Implementation（落地）

| 模块 | 说明 |
|------|------|
| `apps/chrome/src/shared/constants.ts` | `STORAGE_KEY_*`、`POLICY_*`、`STORAGE_KEYS_AFFECTING_INJECTION` |
| `apps/chrome/src/shared/migration.ts` | `resolvePolicyFromSnapshot`、`planStorageMigration`、Vitest 覆盖 |
| `apps/chrome/src/shared/ensure-migrated.ts` | 后台 `ensureStorageMigrated()` |
| `apps/chrome/src/shared/storage.ts` | `readGlobalPolicy`、`readApplyDark`（`readEnabled` 别名） |
| `apps/chrome/src/background.ts` | `onInstalled` / `onStartup` 触发迁移 |
| `apps/chrome/src/content/index.ts` | 监听策略相关键并重算样式 |

## Decision log

- 2026-03-29：初稿。
- 2026-03-29：实现 Approved；`auto` 在内容脚本侧暂与 `on` 同效，待后续主题 RFC 细化。
