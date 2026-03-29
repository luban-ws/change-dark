# RFC 005 — WASM 批颜色 API（T-011）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-011** |

依赖：[001](./001-rust-wasm-monorepo-and-chrome-host.md)

## Summary

在 `dark_color_utils` 增加 **批处理**纯函数（分位数、聚类、对比度检查等），由 `dark_engine` 导出接收 `Uint8Array`/`Float64Array` 的接口，减少 TS 热循环。

## Goals

1. 批 API 全为 **deterministic**、无副作用，便于 `#[test]`。
2. bindgen 导出签名稳定、文档化；大件输入（>N MB）在文档中注明拒绝或分块策略。
3. 与 [RFC 006](./006-content-script-sampling-budget-fallback.md) 约定的输入布局一致。

## Non-goals

- 不在 WASM 内直接访问 DOM。
- 不保证与 Dark Reader 内部算法数值一致。

## Proposal

- 新增函数示例方向：`batch_relative_luminance`、`k_means_rgb`（占位名，实现时以 PR 为准）。
- `crates`: `dark_color_utils` 实现；`dark_engine` 薄封装 + `wasm-pack bundler`。

## Risks

| 风险 | 缓解 |
|------|------|
| 分配压力 | 复用 buffer、上限检查 |
| bindgen 破坏性升级 | 锁定版本 + CI 构建 |

## Testing

- `cargo test` fixture 数组。
- TS：可选 snapshot 小金样本（构建后）。

## Decision log

- 2026-03-29：独立 RFC。
