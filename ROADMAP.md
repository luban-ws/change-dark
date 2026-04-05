# Roadmap — 嫦娥 / Selena

**一事一 RFC**；**完整 RFC 索引与下一编号见下文「RFC 索引」**（单篇规格文件仍在 `docs/rfc/NNN-*.md`）。

## 约定

除 **[001](./docs/rfc/001-rust-wasm-monorepo-and-chrome-host.md)** 作为架构基线外，**每一篇 RFC 只描述一件可交付的事**（一个任务 / 一条能力）。**不设伞形索引 RFC**；任务分组体现在下表。

**编号：**`NNN-short-slug.md`。**下一个可用编号：024**。

**状态枚举：** Draft · Under Review · Approved · Superseded。归档：`docs/rfc/completed/`、`docs/rfc/rejected/`（若存在）。

## RFC 索引

### 基线

| RFC | 标题 | 状态 |
|-----|------|------|
| [001](./docs/rfc/001-rust-wasm-monorepo-and-chrome-host.md) | Rust/WASM 核心与 Chrome 宿主 monorepo | Approved |

### 任务 RFC：算法与扩展能力（T-010～T-013）

| RFC | 任务 | 标题 |
|-----|------|------|
| [004](./docs/rfc/004-policy-storage-migration-from-enabled-boolean.md) | T-010 | 策略存储与 `enabled` 迁移 |
| [005](./docs/rfc/005-wasm-batch-color-api.md) | T-011 | WASM 批颜色 API |
| [006](./docs/rfc/006-content-script-sampling-budget-fallback.md) | T-012 | 采样、预算、回退 |
| [007](./docs/rfc/007-popup-options-minimal-ui.md) | T-013 | Popup / Options 最小 UI |

### 任务 RFC：产品能力（T-020～T-031，对照 [Dark Reader Help](https://darkreader.org/help/en/) 行为，独立实现）

| RFC | 任务 | 标题 |
|-----|------|------|
| [008](./docs/rfc/008-global-on-off-policy.md) | T-020 | 全局 On/Off |
| [009](./docs/rfc/009-toggle-site-ignore-list.md) | T-021 | Toggle site / 忽略列表 |
| [010](./docs/rfc/010-extension-hotkeys.md) | T-022 | 快捷键 |
| [011](./docs/rfc/011-theme-filter-sliders.md) | T-023 | 滤镜滑块 |
| [012](./docs/rfc/012-theme-mode-dynamic.md) | T-024 | Dynamic 模式 |
| [013](./docs/rfc/013-theme-mode-filter-css-invert.md) | T-025 | Filter（CSS 反相） |
| [014](./docs/rfc/014-theme-mode-filter-plus-svg.md) | T-026 | Filter+（SVG） |
| [015](./docs/rfc/015-theme-mode-static.md) | T-027 | Static 模式 |
| [016](./docs/rfc/016-only-for-per-site-overrides.md) | T-028 | Only for 按站覆盖 |
| [017](./docs/rfc/017-site-list-patterns-regex.md) | T-029 | 站点列表 pattern/regex |
| [018](./docs/rfc/018-font-and-text-stroke.md) | T-030 | 字体与文本描边 |
| [019](./docs/rfc/019-per-site-css-selector-fixes.md) | T-031 | 每站 CSS 选择器修复 |

### 发布与站点（Phase 2 子集）

| RFC | 任务 | 标题 |
|-----|------|------|
| [020](./docs/rfc/020-github-pages-site.md) | T-032 | GitHub Pages 落地页（`apps/site`） |

### 扩展 UI 与品牌

| RFC | 任务 | 标题 |
|-----|------|------|
| [022](./docs/rfc/022-solarized-dark-popup-ui.md) | T-034 | Popup / Options：Solarized Dark 配色 |

### 设计记录（管线语义，非新开关）

| RFC | 任务 | 标题 |
|-----|------|------|
| [023](./docs/rfc/023-dynamic-color-engine-pipeline.md) | T-035 | Dynamic 配色管线：采样、聚合与讨论 |

### 元文档（状态 / backlog）

| RFC | 任务 | 标题 |
|-----|------|------|
| [021](./docs/rfc/021-project-status-and-backlog.md) | T-033 | 项目状态快照与未立项能力 |

---

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

**公开站点（GitHub Pages，项目页）：** [https://luban-ws.github.io/change-dark/](https://luban-ws.github.io/change-dark/)（若仓库名或组织变更，请按 `https://<owner>.github.io/<repo>/` 调整。）

- Popup / Options **Solarized Dark** 配色：[RFC 022](./docs/rfc/022-solarized-dark-popup-ui.md)（T-034）。
- e2e / Chrome Web Store 等 backlog：见 **[RFC 021](./docs/rfc/021-project-status-and-backlog.md)**（下一篇功能 RFC 预计从 **024** 起编号；[RFC 023](./docs/rfc/023-dynamic-color-engine-pipeline.md) 为管线设计记录）。
