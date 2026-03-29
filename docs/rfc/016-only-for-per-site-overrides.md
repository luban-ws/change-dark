# RFC 016 — Only for：按站覆盖配置（T-028）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-028** |
| 参考 | [Dark Reader Help — Only for](https://darkreader.org/help/en/) |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)、[011](./011-theme-filter-sliders.md)、[012](./012-theme-mode-dynamic.md) 等模式 RFC

## Summary

「**Only for**」：用户调整滑块/模式时，可选择 **仅应用于当前网站**；存储为 per-origin 覆盖对象，取消后恢复全局默认。

## Goals

1. UI 显式状态：全局编辑 vs 仅当前站编辑。
2. 覆盖结构含：模式枚举、滑块元组（或嵌套对象），版本字段防升级错乱。
3. 与 [RFC 008](./008-global-on-off-policy.md) 不冲突：`off` 优先。

## Non-goals

- 云端同步。

## Risks

| 风险 | 缓解 |
|------|------|
| 存储膨胀 | LRU 或最大条数（后续可另立 RFC） |

## Testing

- Vitest：merge 全局+覆盖 → 有效配置。

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 存储 | `change-dark:site-overrides` → `SiteOverridesStateV1`：`v: 1`，`byOrigin[origin]` → `themeMode?`、`themeFilters?`（部分字段） |
| 合并 | `resolveEffectiveTheme`：`themeMode` 缺省用全局；`themeFilters` 与全局 `clampThemeFilters({ ...global, ...partial })` |
| 注入 | 内容脚本 `readEffectiveThemeForPage()` 替代直接读全局模式/滤镜；`STORAGE_KEYS_AFFECTING_INJECTION` 含本键 |
| Popup | 「全局 / 仅当前站」；写全局或 `upsertSiteTheme*Override`；「清除此站覆盖」调用 `clearSiteOverrideForOrigin` |
| RFC 018 | 单站可部分覆盖 `typography`（`upsertSiteTypographyOverride`）；合并见 `resolveEffectiveTypography` |
| RFC 008 | `policy === off` 时仍由 `readShouldApplyForcedDarkForPage` 短路，不注入 |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved。
