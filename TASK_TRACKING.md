# Task tracking — 嫦娥 / Selena

**一事一 RFC**：每个任务对应一篇 RFC（已完成：`.spec/rfc/completed/`；Draft：`.spec/rfc/*.md`）。  
完整路线图与 Backlog：[ROADMAP.md](./ROADMAP.md) | 设计文档：[docs/dark-engine-design.md](./docs/dark-engine-design.md)

## RFC 001（基线）

| ID | 描述 | 状态 | RFC |
|----|------|------|-----|
| T-001 | 文档与追踪一致 | ✅ Done | [001](./docs/rfc/completed/001-rust-wasm-monorepo-and-chrome-host.md) |
| T-002 | CI：工具链与 Turbo 缓存 | ✅ Done | `.github/workflows/ci.yml` |
| T-003 | 功能规格拆分为单篇 RFC | ✅ Done | 004–024；见 [ROADMAP.md](./ROADMAP.md) |

## T-010～T-031（各一篇 RFC，全部完成）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-010 | [004](./docs/rfc/completed/004-policy-storage-migration-from-enabled-boolean.md) | ✅ Done |
| T-011 | [005](./docs/rfc/completed/005-wasm-batch-color-api.md) | ✅ Done |
| T-012 | [006](./docs/rfc/completed/006-content-script-sampling-budget-fallback.md) | ✅ Done |
| T-013 | [007](./docs/rfc/completed/007-popup-options-minimal-ui.md) | ✅ Done |
| T-020 | [008](./docs/rfc/completed/008-global-on-off-policy.md) | ✅ Done |
| T-021 | [009](./docs/rfc/completed/009-toggle-site-ignore-list.md) | ✅ Done |
| T-022 | [010](./docs/rfc/completed/010-extension-hotkeys.md) | ✅ Done |
| T-023 | [011](./docs/rfc/completed/011-theme-filter-sliders.md) | ✅ Done |
| T-024 | [012](./docs/rfc/completed/012-theme-mode-dynamic.md) | ✅ Done |
| T-025 | [013](./docs/rfc/completed/013-theme-mode-filter-css-invert.md) | ✅ Done |
| T-026 | [014](./docs/rfc/completed/014-theme-mode-filter-plus-svg.md) | ✅ Done |
| T-027 | [015](./docs/rfc/completed/015-theme-mode-static.md) | ✅ Done |
| T-028 | [016](./docs/rfc/completed/016-only-for-per-site-overrides.md) | ✅ Done |
| T-029 | [017](./docs/rfc/completed/017-site-list-patterns-regex.md) | ✅ Done |
| T-030 | [018](./docs/rfc/completed/018-font-and-text-stroke.md) | ✅ Done |
| T-031 | [019](./docs/rfc/completed/019-per-site-css-selector-fixes.md) | ✅ Done |

## GitHub Pages（RFC 020）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-032 | [020](./docs/rfc/completed/020-github-pages-site.md) | ✅ Done |

## Popup Solarized Dark（RFC 022）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-034 | [022](./docs/rfc/completed/022-solarized-dark-popup-ui.md) | ✅ Done |

## Dynamic 管线设计（RFC 023）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-035 | [023](./docs/rfc/completed/023-dynamic-color-engine-pipeline.md) | ✅ Done |

## Popup 现代化（RFC 024）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-036 | [024](./docs/rfc/completed/024-popup-modernization-radix-ui-auto-dark-detection.md) | Radix UI Themes + 嫦娥品牌 + 固定标头 + Auto 智能暗检测 | ✅ Done |

## 策略×模式行为矩阵（RFC 025）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-037 | [025](./docs/rfc/completed/025-policy-mode-behavior-matrix.md) | Auto/On/Off × Filter/Filter+/Dynamic/Static 行为矩阵；Dynamic Auto 检测修复 | ✅ Done |


## RFC 026–032（已完成 / Rejected）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-039 | [026](./.spec/rfc/completed/026-e2e-testing-strategy.md) | E2E：**仅 Dynamic** | ✅ Done |
| T-040 | [027](./.spec/rfc/rejected/027-theme-mode-filter-css-refinement.md) | Filter CSS | **Rejected** |
| T-041 | [028](./.spec/rfc/rejected/028-theme-mode-filter-plus-refinement.md) | Filter+ SVG | **Rejected** |
| T-042 | [029](./.spec/rfc/completed/029-theme-mode-dynamic-refinement.md) | Dynamic **唯一产品** | ✅ Done |
| T-043 | [030](./.spec/rfc/rejected/030-theme-mode-static-refinement.md) | Static 用户模式 | **Rejected** |
| T-044 | [031](./.spec/rfc/completed/031-dynamic-recolor-engine.md) | Dynamic 改色引擎 Phase 1 | ✅ Done |
| T-045 | [032](./.spec/rfc/completed/032-theme-mode-product-consolidation.md) | Dynamic-only 产品整合 | ✅ Done |

## Backlog（无独立 RFC，下一个建议 **033**）

| 方向 | 说明 |
|------|------|
| Chrome Web Store | 上架材料与隐私政策 |

## 设计文档

| 文档 | 路径 |
|------|------|

