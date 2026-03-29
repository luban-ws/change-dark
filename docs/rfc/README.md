# RFC 目录（嫦娥 / Change Dark）

## 约定：一事一 RFC

除 **[001](./001-rust-wasm-monorepo-and-chrome-host.md)** 作为架构基线外，**每一篇 RFC 只描述一件可交付的事**（一个任务 / 一条能力）。**不设伞形索引 RFC**；任务分组仅体现在本页的表格里。

编号：`NNN-short-slug.md`。**下一个可用编号：023**。

## 状态枚举

Draft · Under Review · Approved · Superseded。归档：`completed/`、`rejected/`。

## 基线

| RFC | 标题 | 状态 |
|-----|------|------|
| [001](./001-rust-wasm-monorepo-and-chrome-host.md) | Rust/WASM 核心与 Chrome 宿主 monorepo | Approved |

## 任务 RFC：算法与扩展能力（T-010～T-013）

| RFC | 任务 | 标题 |
|-----|------|------|
| [004](./004-policy-storage-migration-from-enabled-boolean.md) | T-010 | 策略存储与 `enabled` 迁移 |
| [005](./005-wasm-batch-color-api.md) | T-011 | WASM 批颜色 API |
| [006](./006-content-script-sampling-budget-fallback.md) | T-012 | 采样、预算、回退 |
| [007](./007-popup-options-minimal-ui.md) | T-013 | Popup / Options 最小 UI |

## 任务 RFC：产品能力（T-020～T-031，对照 [Dark Reader Help](https://darkreader.org/help/en/) 行为，独立实现）

| RFC | 任务 | 标题 |
|-----|------|------|
| [008](./008-global-on-off-policy.md) | T-020 | 全局 On/Off |
| [009](./009-toggle-site-ignore-list.md) | T-021 | Toggle site / 忽略列表 |
| [010](./010-extension-hotkeys.md) | T-022 | 快捷键 |
| [011](./011-theme-filter-sliders.md) | T-023 | 滤镜滑块 |
| [012](./012-theme-mode-dynamic.md) | T-024 | Dynamic 模式 |
| [013](./013-theme-mode-filter-css-invert.md) | T-025 | Filter（CSS 反相） |
| [014](./014-theme-mode-filter-plus-svg.md) | T-026 | Filter+（SVG） |
| [015](./015-theme-mode-static.md) | T-027 | Static 模式 |
| [016](./016-only-for-per-site-overrides.md) | T-028 | Only for 按站覆盖 |
| [017](./017-site-list-patterns-regex.md) | T-029 | 站点列表 pattern/regex |
| [018](./018-font-and-text-stroke.md) | T-030 | 字体与文本描边 |
| [019](./019-per-site-css-selector-fixes.md) | T-031 | 每站 CSS 选择器修复 |

## 发布与站点（Phase 2 子集）

| RFC | 任务 | 标题 |
|-----|------|------|
| [020](./020-github-pages-site.md) | T-032 | GitHub Pages 落地页（`apps/site`） |

## 扩展 UI 与品牌

| RFC | 任务 | 标题 |
|-----|------|------|
| [022](./022-solarized-dark-popup-ui.md) | T-034 | Popup / Options：Solarized Dark 配色 |

## 元文档（状态 / backlog）

| RFC | 任务 | 标题 |
|-----|------|------|
| [021](./021-project-status-and-backlog.md) | T-033 | 项目状态快照与未立项能力 |
