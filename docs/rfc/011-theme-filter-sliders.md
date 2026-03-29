# RFC 011 — 主题滤镜滑块（亮度 / 对比度 / sepia / 饱和度）（T-023）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-023** |
| 参考 | [Dark Reader Help — Filter settings](https://darkreader.org/help/en/) |

依赖：[001](./001-rust-wasm-monorepo-and-chrome-host.md)、[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

实现四类滑块：**brightness、contrast、sepia、grayscale/saturation**，映射到内容脚本注入的 CSS `filter` 或等价变量；可选由 WASM 做归一化/钳位，但 UI→数值→CSS 链条须确定性强。

## Goals

1. 存储各参数默认值与范围（如 100% 为中性）。
2. 与 [RFC 016](./016-only-for-per-site-overrides.md) 协同：per-site 覆盖全局滑块。
3. 性能：避免每帧重算；导航级或 `storage.onChanged` 更新即可。

## Non-goals

- 不在本 RFC 定义 Dynamic 分析（见 [RFC 012](./012-theme-mode-dynamic.md)）。

## Risks

| 风险 | 缓解 |
|------|------|
| Filter 链顺序影响观感 | 文档锁定顺序并与 Dark Reader 行为大致对齐 |

## Testing

- Vitest：`params → css filter string` 快照。

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 存储 | `change-dark:theme-filters` → `ThemeFiltersStateV1`：`brightness` / `contrast`（10–200，100 中性）、`sepia`（0–100）、`saturate`（0–200，100 中性） |
| Filter 顺序 | `brightness → contrast → sepia → saturate`（见 `THEME_FILTER_CHAIN_ORDER`）；全为中性时不写 `filter` |
| 注入 | `buildDarkCss` 在 `html[data-change-dark-root]` 上附加 `filter:` |
| Popup | 四个 `range` 滑块 + 数值；`change` 时 `persistThemeFiltersState`；`storage` 变更时同步滑块 |
| 内容脚本 | `readThemeFiltersState()` 与采样结果一并注入；`STORAGE_KEYS_AFFECTING_INJECTION` 含本键 |
| RFC 016 | 结构预留 per-site 覆盖（当前仅全局） |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved；第四维采用 **饱和度 `saturate`**（非单独 `grayscale()`），与 Help「Filter」习惯一致。
