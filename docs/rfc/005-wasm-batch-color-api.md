# RFC 005 — WASM 批颜色 API（T-011）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
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
- TS：可选 snapshot 小金样本（构建后）；当前以 `cargo test` + 扩展内批调用链路为主。

## Implementation（落地）

**输入布局（与 RFC 006 一致）**：`Uint8Array` 扁平 RGB，长度 = `3 × 像素数`。

| 层级 | 内容 |
|------|------|
| `dark_color_utils` | `batch_relative_luminance`、`batch_mix_toward_black`、`k_means_rgb_flat`；`#[test]` 覆盖 |
| `dark_engine`（wasm-bindgen） | `batch_relative_luminance`、`batch_mix_toward_black`、`kMeansRgbCentroids`；`max_batch_rgb_bytes()`；`MAX_BATCH_RGB_BYTES` / `MAX_K_MEANS_K` / `MAX_K_MEANS_ITER` 在 Rust 侧约束 |
| 超限 | 超过 `max_batch_rgb_bytes()`（当前 `3 * 524_288` 字节）时 **抛错**（`Result` → JS 异常） |
| `apps/chrome` 内容脚本 | 对单色基准优先调用 `batch_mix_toward_black`，失败回退 `mix_toward_black` |

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved；k-means 为确定性 Lloyd（前 `k_eff` 点初始化），`k` 与 `max_iter` 在引擎内夹紧。
