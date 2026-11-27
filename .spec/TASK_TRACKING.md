# Task tracking — 嫦娥 / Selena

**一事一 RFC**：每个任务对应一篇 RFC（已完成：`.spec/rfc/completed/`；Draft：`.spec/rfc/*.md`）。  
完整路线图与 Backlog：[ROADMAP.md](./ROADMAP.md) | 设计文档：[docs/dark-engine-design.md](./docs/dark-engine-design.md)

## RFC 0001（基线）

| ID | 描述 | 状态 | RFC |
|----|------|------|-----|
| T-001 | 文档与追踪一致 | ✅ Done | [0001](./rfc/completed/0001-rust-wasm-monorepo-and-chrome-host.md) |
| T-002 | CI：工具链与 Turbo 缓存 | ✅ Done | `.github/workflows/ci.yml` |
| T-003 | 功能规格拆分为单篇 RFC | ✅ Done | 004–024；见 [ROADMAP.md](./ROADMAP.md) |

## T-010～T-031（各一篇 RFC，全部完成）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-010 | [0004](./rfc/completed/0004-policy-storage-migration-from-enabled-boolean.md) | ✅ Done |
| T-011 | [0005](./rfc/completed/0005-wasm-batch-color-api.md) | ✅ Done |
| T-012 | [0006](./rfc/completed/0006-content-script-sampling-budget-fallback.md) | ✅ Done |
| T-013 | [0007](./rfc/completed/0007-popup-options-minimal-ui.md) | ✅ Done |
| T-020 | [0008](./rfc/completed/0008-global-on-off-policy.md) | ✅ Done |
| T-021 | [0009](./rfc/completed/0009-toggle-site-ignore-list.md) | ✅ Done |
| T-022 | [0010](./rfc/completed/0010-extension-hotkeys.md) | ✅ Done |
| T-023 | [0011](./rfc/completed/0011-theme-filter-sliders.md) | ✅ Done |
| T-024 | [0012](./rfc/completed/0012-theme-mode-dynamic.md) | ✅ Done |
| T-025 | [0013](./rfc/completed/0013-theme-mode-filter-css-invert.md) | ✅ Done |
| T-026 | [0014](./rfc/completed/0014-theme-mode-filter-plus-svg.md) | ✅ Done |
| T-027 | [0015](./rfc/completed/0015-theme-mode-static.md) | ✅ Done |
| T-028 | [0016](./rfc/completed/0016-only-for-per-site-overrides.md) | ✅ Done |
| T-029 | [0017](./rfc/completed/0017-site-list-patterns-regex.md) | ✅ Done |
| T-030 | [0018](./rfc/completed/0018-font-and-text-stroke.md) | ✅ Done |
| T-031 | [0019](./rfc/completed/0019-per-site-css-selector-fixes.md) | ✅ Done |

## GitHub Pages（RFC 0020）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-032 | [0020](./rfc/completed/0020-github-pages-site.md) | ✅ Done |

## Popup Solarized Dark（RFC 0022）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-034 | [0022](./rfc/completed/0022-solarized-dark-popup-ui.md) | ✅ Done |

## Dynamic 管线设计（RFC 0023）

| ID | 专属 RFC | 状态 |
|----|----------|------|
| T-035 | [0023](./rfc/completed/0023-dynamic-color-engine-pipeline.md) | ✅ Done |

## Popup 现代化（RFC 0024）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-036 | [0024](./rfc/completed/0024-popup-modernization-radix-ui-auto-dark-detection.md) | Radix UI Themes + 嫦娥品牌 + 固定标头 + Auto 智能暗检测 | ✅ Done |

## 策略×模式行为矩阵（RFC 0025）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-037 | [0025](./rfc/completed/0025-policy-mode-behavior-matrix.md) | Auto/On/Off × Filter/Filter+/Dynamic/Static 行为矩阵；Dynamic Auto 检测修复 | ✅ Done |


## RFC 0026–032（已完成 / Rejected）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-039 | [0026](./rfc/completed/0026-e2e-testing-strategy.md) | E2E：**仅 Dynamic** | ✅ Done |
| T-040 | [0027](./rfc/rejected/0027-theme-mode-filter-css-refinement.md) | Filter CSS | **Rejected** |
| T-041 | [0028](./rfc/rejected/0028-theme-mode-filter-plus-refinement.md) | Filter+ SVG | **Rejected** |
| T-042 | [0029](./rfc/completed/0029-theme-mode-dynamic-refinement.md) | Dynamic **唯一产品** | ✅ Done |
| T-043 | [0030](./rfc/rejected/0030-theme-mode-static-refinement.md) | Static 用户模式 | **Rejected** |
| T-044 | [0031](./rfc/completed/0031-dynamic-recolor-engine.md) | Dynamic 改色引擎 Phase 1 | ✅ Done |
| T-045 | [0032](./rfc/completed/0032-theme-mode-product-consolidation.md) | Dynamic-only 产品整合 | ✅ Done |

## RFC 0033 — 跨站点表面修复层（已完成）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-046 | [0033](rfc/completed/0033-cross-site-surface-repair-layer.md) | Surface Repair：三层 sweep、启发式、border/box-shadow recolor | ✅ Done |

## RFC 0034 — Site Profile Catalog（已完成）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-047 | [0034](rfc/completed/0034-site-profile-catalog.md) | `@change-dark/site-catalog`、GMP profile、user patch + `cssVarSubstitute` 接线 | ✅ Done |

## RFC 0035 — Chrome Web Store 发布 v0.1.2+（Draft）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-048 | [0035](./rfc/0035-chrome-web-store-release-v0-1-2.md) | CI 绿 + E2E P0 + listing 同步 + bump 0.1.2 + 提审 | 🔄 Ready to submit |

### T-048 子任务（见 RFC §5）

| 子项 | 内容 | 状态 |
|------|------|------|
| A1 | 修复 `visible-light-surface-sweep` Linux CI | ✅ |
| A2 | E2E P0 发布前跑通 | ✅ 10/10 |
| B1 | `chrome-web-store-listing.md` Dynamic-only | ✅ |
| B2 | 截图与当前 popup 一致 | ✅（已有 `docs/publish/screenshot-*`） |
| C1 | version 0.1.2 | ✅ |
| C2 | pack → `change-dark-extension.zip` | ✅ |
| C3 | Dashboard 提交 | ☐ 人工 |

## RFC 0036 — CSS 变量改色图（已完成）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-049 | [0036](rfc/completed/0036-css-variable-recolor-graph.md) | 变量图：定义/用法改写，对齐 DR VariablesStore；修浅灰底 | ✅ Done |

### T-049 子任务（见 RFC Delivery）

| 子项 | 内容 | 状态 |
|------|------|------|
| S0 | `buildCssVariableGraph` + 单测 | ✅ |
| S1 | 中性 `--*` 定义 → `--cd-page-*` / WASM + `:root` 前缀 | ✅ |
| S2 | 简单 `var(--name)` 用法生效 + fixture computed | ✅ |
| S3 | 接入 `buildRecolorInjectionFromSource` + 回归 | ✅ |
| S4 | 更新 CLAUDE.md / 031 Phase 1.5 交叉引用 | ✅ |

## RFC 0037 — 开放 Shadow DOM 与 adoptedStyleSheets（已完成）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-050 | [0037](rfc/completed/0037-open-shadow-style-roots.md) | 开放 ShadowRoot + `adoptedStyleSheets` 动态改色与 CLEANUP | ✅ Done |

## RFC 0038 — Theme DSL（.theme）与 Rust winnow 及异步批改色（已完成）

| ID | 专属 RFC | 内容 | 状态 |
|----|----------|------|------|
| T-051 | [0038](rfc/completed/0038-theme-dsl-winnow.md) | `.theme` Rust `winnow` 解析/格式化/校验 CLI + WASM 直接执行 + `batchModifyColorsAsync` | ✅ Done |

## Backlog（下一个建议 **039**）

| 方向 | 说明 |
|------|------|
| CWS Publish API | CI 自动上传 draft package |
| 跨域 stylesheet fetch | 031 §6；变量图之后 |

## 设计文档

| 文档 | 路径 |
|------|------|

## Active

- [ ] Implement RFC 0035: Chrome Web Store 发布（v0.1.2+） (RFC 0035)

## Done


- [x] Implement RFC 0001: Rust/WASM 核心与 Chrome 宿主（pnpm + Turbo monorepo） (RFC 0001)
- [x] Implement RFC 0004: 策略存储与 `enabled` boolean 迁移（T-010） (RFC 0004)
- [x] Implement RFC 0005: WASM 批颜色 API（T-011） (RFC 0005)
- [x] Implement RFC 0006: 内容脚本采样、性能预算与回退（T-012） (RFC 0006)
- [x] Implement RFC 0007: Popup / Options 最小 UI（T-013） (RFC 0007)
- [x] Implement RFC 0008: 全局 On/Off（policy）（T-020） (RFC 0008)
- [x] Implement RFC 0009: Toggle site 与忽略列表（T-021） (RFC 0009)
- [x] Implement RFC 0010: 扩展快捷键（T-022） (RFC 0010)
- [x] Implement RFC 0011: 主题滤镜滑块（亮度 / 对比度 / sepia / 饱和度）（T-023） (RFC 0011)
- [x] Implement RFC 0012: 主题模式：Dynamic（T-024） (RFC 0012)
- [x] Implement RFC 0013: 主题模式：Filter（CSS 反相）（T-025） (RFC 0013)
- [x] Implement RFC 0014: 主题模式：Filter+（SVG filter）（T-026） (RFC 0014)
- [x] Implement RFC 0015: 主题模式：Static（T-027） (RFC 0015)
- [x] Implement RFC 0016: Only for：按站覆盖配置（T-028） (RFC 0016)
- [x] Implement RFC 0017: 站点列表：模式、正则与两种列表逻辑（T-029） (RFC 0017)
- [x] Implement RFC 0018: 字体与文本描边（T-030） (RFC 0018)
- [x] Implement RFC 0019: 每站 CSS 选择器修复（Dev tools 类）（T-031） (RFC 0019)
- [x] Implement RFC 0020: GitHub Pages 落地页（`apps/site`） (RFC 0020)
- [x] Implement RFC 0022: Popup / Options：Solarized Dark 界面配色（T-034） (RFC 0022)
- [x] Implement RFC 0023: Dynamic 配色管线：采样、聚合与语义讨论（T-035） (RFC 0023)
- [x] Implement RFC 0024: Popup UI 现代化：Radix UI Themes + 嫦娥品牌 + 智能暗色检测（T-036） (RFC 0024)
- [x] Implement RFC 0025: 全局策略（Auto/On/Off）× 主题模式行为矩阵 (RFC 0025)
- [x] Implement RFC 0026: E2E：仅 Dynamic (RFC 0026)
- [x] Implement RFC 0027: Filter（CSS）模式：语义澄清（**Dropped**） (RFC 0027)
- [x] Implement RFC 0028: Filter+（SVG）模式（**Dropped**） (RFC 0028)
- [x] Implement RFC 0029: Dynamic：唯一产品主题（引擎 RFC 0031 + 内部铺底） (RFC 0029)
- [x] Implement RFC 0030: Static 模式（**Dropped**） (RFC 0030)
- [x] Implement RFC 0031: Dynamic 逐规则改色引擎（对齐 Dark Reader → Rust 反超） (RFC 0031)
- [x] Implement RFC 0032: Dynamic-only 产品（移除 Static / Filter / Filter+） (RFC 0032)
- [x] Implement RFC 0033: 跨站点表面修复层（Surface Repair Layer） (RFC 0033)
- [x] Implement RFC 0034: Site Profile Catalog（数据驱动站点策略，超越 Dark Reader） (RFC 0034)
- [x] Implement RFC 0036: CSS 变量改色图（对齐 Dark Reader VariablesStore） (RFC 0036)
- [x] Implement RFC 0037: 开放 Shadow DOM 与 adoptedStyleSheets 动态改色 (RFC 0037)
- [x] Implement RFC 0038: Theme DSL（.theme）与 Rust winnow 编译器及异步批改色 (RFC 0038)
- [x] Implement RFC 0039: 修复内容脚本 WASM 初始化竞态与暗色开关即时生效 (RFC 0039)
- [x] Implement RFC 0040: Popup 异步壳首帧加载进度与启动性能优化 (RFC 0040)







