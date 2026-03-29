# RFC 011 — 主题滤镜滑块（亮度 / 对比度 / sepia / 饱和度）（T-023）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
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

## Decision log

- 2026-03-29：独立 RFC。
