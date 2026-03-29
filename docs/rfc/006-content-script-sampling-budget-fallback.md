# RFC 006 — 内容脚本采样、性能预算与回退（T-012）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-012** |

依赖：[001](./001-rust-wasm-monorepo-and-chrome-host.md)、[005](./005-wasm-batch-color-api.md)、[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

在 `document_start` 后有限预算内对页面做 **代表性采样**（computed style / 元素子集），将数据送入 WASM；超时或失败时 **回退** 到轻量策略（参见 [RFC 015](./015-theme-mode-static.md) 或与当前 v1 固定色一致）。

## Goals

1. 明示 **最大节点数、时间墙**；可配置（存储见 RFC 004 扩展字段或专用键）。
2. 避免强制同步布局风暴：批量读、惰性扫描。
3. 与 [RFC 012](./012-theme-mode-dynamic.md) 产品向一致：本 RFC 负责工程化采样与回退机制。

## Non-goals

- 不全量遍历样式表文本（留给后续专门优化 RFC 若需要）。

## Proposal（数据流）

```
Content script ──(budget)──▶ 采样 RGB 缓冲 ──▶ dark_engine（RFC 005）
        │ 超预算/异常
        └──────────────────▶ Static / 固定色回退
```

## Risks

| 风险 | 缓解 |
|------|------|
| 采样偏置 | 分层抽样：viewport + 根子树 |
| `requestIdleCallback` 不可用 | `setTimeout` 分片 |

## Testing

- Vitest：预算模块纯函数；模拟时钟。
- 手工：大 DOM 页面对比 CPU。

## Decision log

- 2026-03-29：独立 RFC。
