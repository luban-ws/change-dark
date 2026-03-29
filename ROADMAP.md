# Roadmap — 嫦娥 / Change Dark

**一事一 RFC**；任务与编号见 [docs/rfc/README.md](./docs/rfc/README.md)。

## Phase 0 — 基线（已完成）

| RFC | 说明 |
|-----|------|
| [001](./docs/rfc/001-rust-wasm-monorepo-and-chrome-host.md)（Approved） | monorepo、WASM、MV3、CI |

## Phase 1 — 按单篇 RFC 交付（进行中）

- **004**（T-010）：策略存储与 `enabled` 迁移 — **Done**（见 RFC 004 Implementation）。
- **005**（T-011）：WASM 批颜色 API — **Done**（见 RFC 005 Implementation）。
- **006**（T-012）：内容脚本采样、预算与回退 — **Done**（见 RFC 006 Implementation）。
- **007**（T-013）：Popup 最小 UI — **Done**（见 RFC 007 Implementation；`options_page` 未加，可渐进）。
- **008**（T-020）：全局 On/Off（policy）— **Done**（见 RFC 008 Implementation）。
- **009**（T-021）：Toggle site / 忽略列表 — **Done**（见 RFC 009 Implementation）。
- **010**（T-022）：扩展快捷键 — **Done**（见 RFC 010 Implementation）。
- **011**（T-023）：主题滤镜滑块 — **Done**（见 RFC 011 Implementation）。
- **012–019**：T-024～T-031（对标 Dark Reader 用户能力，[Help](https://darkreader.org/help/en/)，独立实现）。

存储与策略真源以 **[RFC 004](./docs/rfc/004-policy-storage-migration-from-enabled-boolean.md)** 为准。

## Phase 2 — 质量与发布（部分进行）

| 主题 | RFC | 说明 |
|------|-----|------|
| GitHub Pages 落地页 | [020](./docs/rfc/020-github-pages-site.md)（**Approved**） | `apps/site` + `deploy-github-pages`；全仓回归见 `ci.yml` |

- e2e / Chrome Web Store：待 **RFC 021+**。
