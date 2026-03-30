# RFC 021 — 项目状态快照与未立项能力（backlog）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-033** |
| 创建日期 | 2026-03-29 |

依赖：[001](./001-rust-wasm-monorepo-and-chrome-host.md)（仓库约定）

## Summary

本文档是 **元文档**：汇总截至撰写时 **已 Approved 且已按 Implementation 落地** 的 RFC 范围，并列出 **尚未单独成文或未实现** 的能力方向，便于路线图与任务拆分。**不替代**各篇功能 RFC 中的技术真源；冲突时以对应功能 RFC 为准。

> **与「一事一 RFC」的关系**：仓库约定原则上不设伞形索引 RFC；本篇仅用于 **状态 / backlog 可见性**，不参与运行时行为。

## 当前交付概览（已完成 RFC）

| 阶段 | RFC 范围 | 说明 |
|------|-----------|------|
| 基线 | [001](./001-rust-wasm-monorepo-and-chrome-host.md) | Monorepo、Rust/WASM、MV3、CI 等 |
| Phase 1 能力 | [004](./004-policy-storage-migration-from-enabled-boolean.md)–[019](./019-per-site-css-selector-fixes.md)（T-010～T-031） | 策略存储、采样、Popup/选项 UI、全局开关、站点列表与快捷键、主题模式与滤镜、Only for、站点列表 pattern、字体/描边、每站自定义 CSS 等；详见各篇 **Implementation** |
| Phase 2（站点） | [020](./020-github-pages-site.md)（T-032） | `apps/site` 落地页与 GitHub Pages 部署 |

**策略与存储真源**仍以 [RFC 004](./004-policy-storage-migration-from-enabled-boolean.md) 为准。

**渐进项说明**：[RFC 007](./007-popup-options-minimal-ui.md) 首版仅 `action` popup；现已通过 **`options_ui`（与 popup 同 HTML、`open_in_tab`）** 在新标签打开同一套 UI，满足「选项页」渐进需求（见 RFC 007 Decision log）。

## 「未完成」的界定

本文档中 **未完成** 指下列之一（与 RFC 首行 `状态: Draft` 无必然对应——当前仓库内功能 RFC **均为 Approved**）：

1. **尚无独立 RFC** 的能力（ROADMAP 已点名或业界常见后续）。
2. **已有 RFC 的 Non-goals** 中明确推迟的事项。
3. **持续改进**（性能、无障碍、国际化等），未单独立项。

## 当前无独立 RFC / 未闭环项（backlog）

以下 **尚未** 对应独立 RFC（`docs/rfc/024+`）与 T-036+ 任务分配（命名可后续调整）；**Dynamic 配色管线** 已见 [RFC 023](./023-dynamic-color-engine-pipeline.md)（T-035）：

| 方向 | 说明 | 参考 |
|------|------|------|
| 端到端（E2E）测试 | 加载未打包扩展、打开页面、断言注入/存储等自动化 | [ROADMAP](../ROADMAP.md) Phase 2 |
| Chrome Web Store 上架 | 打包、清单、隐私政策、审核素材与说明 | [ROADMAP](../ROADMAP.md)；[RFC 020](./020-github-pages-site.md) Non-goals（不托管 `.crx`） |
| 扩展产物分发页 | 落地页不强制托管 `.crx`；若官方下载与商店并行，宜另立 RFC | [RFC 020](./020-github-pages-site.md) |
| 云同步 / 账号 | 非当前仓库范围；若做需独立 RFC | — |

## 仓库内 Draft 状态 RFC

截至本文撰写：**0 篇**（`docs/rfc/` 下功能 RFC 均为 **Approved**）。

## Risks

| 风险 | 缓解 |
|------|------|
| 本文滞后于主分支 | 重大里程碑或新增 RFC 时更新本文与 [README](./README.md) 下一编号 |
| 与功能 RFC 表述冲突 | 以具体功能 RFC + `storage`/代码为准 |

## Testing

- 人工：对照 `TASK_TRACKING.md`、`ROADMAP.md` 与 `docs/rfc/README.md` 表格一致性。

## Decision log

- 2026-03-29：新增 RFC 021（T-033），作为状态与 backlog 单点说明。
