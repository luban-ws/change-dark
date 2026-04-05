# Task tracking — 嫦娥 / Selena

**一事一 RFC**：每个任务对应一篇 RFC；**索引与编号**见 [ROADMAP.md](./ROADMAP.md) 中的「RFC 索引」一节。

## RFC 001（基线）

| ID | 描述 | Owner | 状态 | 备注 |
|----|------|-------|------|------|
| T-001 | 文档与追踪一致 | — | Done | [001](./docs/rfc/001-rust-wasm-monorepo-and-chrome-host.md) |
| T-002 | CI：工具链与 Turbo 缓存 | — | Done | `.github/workflows/ci.yml` |
| T-003 | 功能规格拆分为单篇 RFC | — | Done | [004](./docs/rfc/004-policy-storage-migration-from-enabled-boolean.md)–[019](./docs/rfc/019-per-site-css-selector-fixes.md)；元文档 [021](./docs/rfc/021-project-status-and-backlog.md) |

## T-010～T-031（各一篇 RFC）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-010 | [004](./docs/rfc/004-policy-storage-migration-from-enabled-boolean.md) | Done |
| T-011 | [005](./docs/rfc/005-wasm-batch-color-api.md) | Done |
| T-012 | [006](./docs/rfc/006-content-script-sampling-budget-fallback.md) | Done |
| T-013 | [007](./docs/rfc/007-popup-options-minimal-ui.md) | Done |
| T-020 | [008](./docs/rfc/008-global-on-off-policy.md) | Done |
| T-021 | [009](./docs/rfc/009-toggle-site-ignore-list.md) | Done |
| T-022 | [010](./docs/rfc/010-extension-hotkeys.md) | Done |
| T-023 | [011](./docs/rfc/011-theme-filter-sliders.md) | Done |
| T-024 | [012](./docs/rfc/012-theme-mode-dynamic.md) | Done |
| T-025 | [013](./docs/rfc/013-theme-mode-filter-css-invert.md) | Done |
| T-026 | [014](./docs/rfc/014-theme-mode-filter-plus-svg.md) | Done |
| T-027 | [015](./docs/rfc/015-theme-mode-static.md) | Done |
| T-028 | [016](./docs/rfc/016-only-for-per-site-overrides.md) | Done |
| T-029 | [017](./docs/rfc/017-site-list-patterns-regex.md) | Done |
| T-030 | [018](./docs/rfc/018-font-and-text-stroke.md) | Done |
| T-031 | [019](./docs/rfc/019-per-site-css-selector-fixes.md) | Done |

## GitHub Pages（RFC 020）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-032 | [020](./docs/rfc/020-github-pages-site.md) | Done |

## 元文档（RFC 021）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-033 | [021](./docs/rfc/021-project-status-and-backlog.md) | Done |

## 扩展 UI（RFC 022）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-034 | [022](./docs/rfc/022-solarized-dark-popup-ui.md) | Done |

## Dynamic 管线设计（RFC 023）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-035 | [023](./docs/rfc/023-dynamic-color-engine-pipeline.md) | Done |

## 习惯用法

完成实现时：将对应 RFC 状态更新为 Approved（或归档），并在此表 **状态** 列增加 Done / 链接 PR。
