# Roadmap — 嫦娥 / Selena

**下一个可用 RFC 编号：0038**。  
RFC 文档根目录：**`.spec/rfc/`**（completed 在 `.spec/rfc/completed/`）。  
WASM 引擎设计：[docs/dark-engine-design.md](./docs/dark-engine-design.md)  
任务追踪：[TASK_TRACKING.md](./TASK_TRACKING.md)

---

## 产品方向（2026-06-09）

**只聚焦 Dynamic。** Static、Filter、Filter+ **Rejected**（见 [RFC 0032](./rfc/completed/0032-theme-mode-product-consolidation.md)）。

---

## RFC 索引

### 基线

| RFC | 标题 | 状态 |
|-----|------|------|
| [0001](./rfc/completed/0001-rust-wasm-monorepo-and-chrome-host.md) | Rust/WASM 核心与 Chrome 宿主 monorepo | ✅ |

### 算法与扩展能力（T-010～T-013）

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [0004](./rfc/completed/0004-policy-storage-migration-from-enabled-boolean.md) | T-010 | 策略存储与 `enabled` 迁移 | ✅ |
| [0005](./rfc/completed/0005-wasm-batch-color-api.md) | T-011 | WASM 批颜色 API | ✅ |
| [0006](./rfc/completed/0006-content-script-sampling-budget-fallback.md) | T-012 | 采样、预算、回退 | ✅ |
| [0007](./rfc/completed/0007-popup-options-minimal-ui.md) | T-013 | Popup / Options 最小 UI | ✅ |

### 产品能力（T-020～T-031）

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [0008](./rfc/completed/0008-global-on-off-policy.md) | T-020 | 全局 On/Off（Auto/On/Off 三态策略） | ✅ |
| [0009](./rfc/completed/0009-toggle-site-ignore-list.md) | T-021 | Toggle site / 忽略列表 | ✅ |
| [0010](./rfc/completed/0010-extension-hotkeys.md) | T-022 | 快捷键 | ✅ |
| [0011](./rfc/completed/0011-theme-filter-sliders.md) | T-023 | 滤镜滑块 | ✅ |
| [0012](./rfc/completed/0012-theme-mode-dynamic.md) | T-024 | Dynamic 模式 | ✅ |
| [0013](./rfc/completed/0013-theme-mode-filter-css-invert.md) | T-025 | Filter（CSS 反相） | ✅ |
| [0014](./rfc/completed/0014-theme-mode-filter-plus-svg.md) | T-026 | Filter+（SVG） | ✅ |
| [0015](./rfc/completed/0015-theme-mode-static.md) | T-027 | Static 模式 | ✅ |
| [0016](./rfc/completed/0016-only-for-per-site-overrides.md) | T-028 | Only for / 按站覆盖 | ✅ |
| [0017](./rfc/completed/0017-site-list-patterns-regex.md) | T-029 | 站点列表 pattern/regex | ✅ |
| [0018](./rfc/completed/0018-font-and-text-stroke.md) | T-030 | 字体与文本描边 | ✅ |
| [0019](./rfc/completed/0019-per-site-css-selector-fixes.md) | T-031 | 每站 CSS 选择器修复 | ✅ |

### 发布与站点

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [0020](./rfc/completed/0020-github-pages-site.md) | T-032 | GitHub Pages 落地页（`apps/site`） | ✅ |

### UI / 品牌

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [0022](./rfc/completed/0022-solarized-dark-popup-ui.md) | T-034 | Popup / Options：Solarized Dark 配色 | ✅ |
| [0024](./rfc/completed/0024-popup-modernization-radix-ui-auto-dark-detection.md) | T-036 | Popup 现代化：Radix UI + 嫦娥品牌 + Auto 智能检测 | ✅ |

### 设计记录

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [0023](./rfc/completed/0023-dynamic-color-engine-pipeline.md) | T-035 | Dynamic 配色管线：采样、聚合语义讨论 | ✅ |
| [0025](./rfc/completed/0025-policy-mode-behavior-matrix.md) | T-037 | 策略×模式行为矩阵：Auto/On/Off × Filter/Filter+/Dynamic/Static | ✅ |
| [0031](./rfc/completed/0031-dynamic-recolor-engine.md) | T-044 | Dynamic 逐规则改色（Rust/WASM）；Phase 1 ✅ | ✅ |
| [0026](./rfc/completed/0026-e2e-testing-strategy.md) | T-039 | E2E：**仅 Dynamic** | ✅ |
| [0029](./rfc/completed/0029-theme-mode-dynamic-refinement.md) | T-042 | Dynamic **唯一产品** | ✅ |
| [0032](./rfc/completed/0032-theme-mode-product-consolidation.md) | T-045 | Dynamic-only：删模式/迁移/铺底 | ✅ |
| [0033](rfc/completed/0033-cross-site-surface-repair-layer.md) | T-046 | 跨站点表面修复层（三层 sweep + border recolor） | ✅ Implemented |
| [0034](rfc/completed/0034-site-profile-catalog.md) | T-047 | Site Profile Catalog（数据驱动，超越 DR） | ✅ Implemented |
| [0035](rfc/completed/0035-chrome-web-store-release-v0-1-2.md) | T-048 | Chrome Web Store 发布（v0.1.2+） | 📝 Implemented |
| [0036](rfc/completed/0036-css-variable-recolor-graph.md) | T-049 | CSS 变量改色图（DR VariablesStore 对齐 / 031 Phase 1.5） | ✅ Implemented |
| [0037](rfc/completed/0037-open-shadow-style-roots.md) | T-050 | 开放 Shadow DOM 与 adoptedStyleSheets 动态改色 | ✅ Implemented |
| [0038](rfc/completed/0038-theme-dsl-winnow.md) | T-051 | Theme DSL（.theme）与 Rust winnow 编译器及异步批改色 | ✅ Implemented |

---

## 当前进行中 / Backlog

### 进行中

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [0035](rfc/completed/0035-chrome-web-store-release-v0-1-2.md) | T-048 | CWS 发布：CI/E2E 门禁 + listing + v0.1.2 提审 | 📝 Implemented |

### Rejected（产品范围外）

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [0027](./rfc/rejected/0027-theme-mode-filter-css-refinement.md) | T-040 | Filter CSS | **Rejected** |
| [0028](./rfc/rejected/0028-theme-mode-filter-plus-refinement.md) | T-041 | Filter+ SVG | **Rejected** |
| [0030](./rfc/rejected/0030-theme-mode-static-refinement.md) | T-043 | Static 用户模式 | **Rejected** |

### 其他 Backlog

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **CWS Publish API / CI 自动上传** | 见 [RFC 0035](rfc/completed/0035-chrome-web-store-release-v0-1-2.md) §3 Out of scope | 低 |
| **跨域 stylesheet fetch** | 031 §6 另开；变量图之后 | 中 |

---

## 已完成阶段总结

### Phase 0 — 基线
Monorepo 架构、Rust/WASM 工具链、MV3 Chrome 扩展宿主、CI 流水线（RFC 0001）。

### Phase 1 — 核心能力
策略存储与迁移、内容脚本采样引擎、WASM 批颜色计算、Popup UI、四种主题模式（Dynamic/Static/Filter/Filter+）、滤镜滑块、站点列表与快捷键、Only for 按站覆盖、字体/描边、每站自定义 CSS（RFC 0004–019）。

### Phase 2 — 质量与发布（进行中）
GitHub Pages 落地页（RFC 0020）、Popup Solarized Dark 配色（RFC 0022）、Popup 现代化重构（RFC 0024）。
Dynamic 变量图 Phase 1.5（RFC 0036）、开放 Shadow DOM 与 `adoptedStyleSheets`（RFC 0037）、`.theme` Rust `winnow` DSL 与异步批改色（RFC 0038）。
| 0039 | [修复内容脚本 WASM 初始化竞态与暗色开关即时生效](rfc/completed/0039-wasm-tla-and-instant-dark-toggle.md) | Implemented |
| 0040 | [Popup 异步壳首帧加载进度与启动性能优化](rfc/completed/0040-async-shell-first-popup-perf.md) | Implemented |
| 0041 | [Popup 异步入口脚本优化、骨架屏进度反馈与性能回归测试](rfc/completed/0041-popup-async-script-and-perf-test.md) | Implemented |
