# Roadmap — 嫦娥 / Change Dark

**一事一 RFC**；任务与编号见 [docs/rfc/README.md](./docs/rfc/README.md)。

## Phase 0 — 基线（已完成）

| RFC | 说明 |
|-----|------|
| [001](./docs/rfc/001-rust-wasm-monorepo-and-chrome-host.md)（Approved） | monorepo、WASM、MV3、CI |

## Phase 1 — 按单篇 RFC 交付（已完成）

- **004**（T-010）：策略存储与 `enabled` 迁移 — **Done**（见 RFC 004 Implementation）。
- **005**（T-011）：WASM 批颜色 API — **Done**（见 RFC 005 Implementation）。
- **006**（T-012）：内容脚本采样、预算与回退 — **Done**（见 RFC 006 Implementation）。
- **007**（T-013）：Popup 最小 UI — **Done**（见 RFC 007 Implementation；`options_ui` 与 popup 同页、新标签打开）。
- **008**（T-020）：全局 On/Off（policy）— **Done**（见 RFC 008 Implementation）。
- **009**（T-021）：Toggle site / 忽略列表 — **Done**（见 RFC 009 Implementation）。
- **010**（T-022）：扩展快捷键 — **Done**（见 RFC 010 Implementation）。
- **011**（T-023）：主题滤镜滑块 — **Done**（见 RFC 011 Implementation）。
- **012**（T-024）：主题模式 Dynamic / Static — **Done**（见 RFC 012 Implementation）。
- **013**（T-025）：Filter（CSS 反相）— **Done**（见 RFC 013 Implementation）。
- **014**（T-026）：Filter+（SVG filter）— **Done**（见 RFC 014 Implementation）。
- **015**（T-027）：Static 模式（基础样式表 + 排版覆盖）— **Done**（见 RFC 015 Implementation）。
- **016**（T-028）：Only for / 按站覆盖 — **Done**（见 RFC 016 Implementation）。
- **017**（T-029）：站点列表（模式、glob、正则、两种语义）— **Done**（见 RFC 017 Implementation）。
- **018**（T-030）：字体与文本描边 — **Done**（见 RFC 018 Implementation）。
- **019**（T-031）：每站自定义 CSS（Dev tools 类）— **Done**（见 RFC 019 Implementation）。

存储与策略真源以 **[RFC 004](./docs/rfc/004-policy-storage-migration-from-enabled-boolean.md)** 为准。

**状态与未完成项索引**（元文档，非功能真源）：[RFC 021](./docs/rfc/021-project-status-and-backlog.md)。

**Dynamic 代表色管线（设计讨论与决策索引）**：[RFC 023](./docs/rfc/023-dynamic-color-engine-pipeline.md)（T-035）；技术真源仍以 [RFC 005](./docs/rfc/005-wasm-batch-color-api.md)、[RFC 006](./docs/rfc/006-content-script-sampling-budget-fallback.md) 的 Implementation 为准。

## Phase 2 — 质量与发布（部分进行）

| 主题 | RFC | 说明 |
|------|-----|------|
| GitHub Pages 落地页 | [020](./docs/rfc/020-github-pages-site.md)（**Approved**） | `apps/site` + `deploy-github-pages`；全仓回归见 `ci.yml` |

- Popup / Options **Solarized Dark** 配色：[RFC 022](./docs/rfc/022-solarized-dark-popup-ui.md)（T-034）。
- e2e / Chrome Web Store 等 backlog：见 **[RFC 021](./docs/rfc/021-project-status-and-backlog.md)**（下一篇功能 RFC 预计从 **024** 起编号；[RFC 023](./docs/rfc/023-dynamic-color-engine-pipeline.md) 为管线设计记录）。
