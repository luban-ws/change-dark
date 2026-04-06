# Roadmap — 嫦娥 / Selena

**下一个可用 RFC 编号：025**。  
已完成的 RFC 归档于 `docs/rfc/completed/`。  
WASM 引擎设计：[docs/dark-engine-design.md](./docs/dark-engine-design.md)  
任务追踪：[TASK_TRACKING.md](./TASK_TRACKING.md)

---

## RFC 索引

### 基线

| RFC | 标题 | 状态 |
|-----|------|------|
| [001](./docs/rfc/completed/001-rust-wasm-monorepo-and-chrome-host.md) | Rust/WASM 核心与 Chrome 宿主 monorepo | ✅ |

### 算法与扩展能力（T-010～T-013）

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [004](./docs/rfc/completed/004-policy-storage-migration-from-enabled-boolean.md) | T-010 | 策略存储与 `enabled` 迁移 | ✅ |
| [005](./docs/rfc/completed/005-wasm-batch-color-api.md) | T-011 | WASM 批颜色 API | ✅ |
| [006](./docs/rfc/completed/006-content-script-sampling-budget-fallback.md) | T-012 | 采样、预算、回退 | ✅ |
| [007](./docs/rfc/completed/007-popup-options-minimal-ui.md) | T-013 | Popup / Options 最小 UI | ✅ |

### 产品能力（T-020～T-031）

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [008](./docs/rfc/completed/008-global-on-off-policy.md) | T-020 | 全局 On/Off（Auto/On/Off 三态策略） | ✅ |
| [009](./docs/rfc/completed/009-toggle-site-ignore-list.md) | T-021 | Toggle site / 忽略列表 | ✅ |
| [010](./docs/rfc/completed/010-extension-hotkeys.md) | T-022 | 快捷键 | ✅ |
| [011](./docs/rfc/completed/011-theme-filter-sliders.md) | T-023 | 滤镜滑块 | ✅ |
| [012](./docs/rfc/completed/012-theme-mode-dynamic.md) | T-024 | Dynamic 模式 | ✅ |
| [013](./docs/rfc/completed/013-theme-mode-filter-css-invert.md) | T-025 | Filter（CSS 反相） | ✅ |
| [014](./docs/rfc/completed/014-theme-mode-filter-plus-svg.md) | T-026 | Filter+（SVG） | ✅ |
| [015](./docs/rfc/completed/015-theme-mode-static.md) | T-027 | Static 模式 | ✅ |
| [016](./docs/rfc/completed/016-only-for-per-site-overrides.md) | T-028 | Only for / 按站覆盖 | ✅ |
| [017](./docs/rfc/completed/017-site-list-patterns-regex.md) | T-029 | 站点列表 pattern/regex | ✅ |
| [018](./docs/rfc/completed/018-font-and-text-stroke.md) | T-030 | 字体与文本描边 | ✅ |
| [019](./docs/rfc/completed/019-per-site-css-selector-fixes.md) | T-031 | 每站 CSS 选择器修复 | ✅ |

### 发布与站点

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [020](./docs/rfc/completed/020-github-pages-site.md) | T-032 | GitHub Pages 落地页（`apps/site`） | ✅ |

### UI / 品牌

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [022](./docs/rfc/completed/022-solarized-dark-popup-ui.md) | T-034 | Popup / Options：Solarized Dark 配色 | ✅ |
| [024](./docs/rfc/completed/024-popup-modernization-radix-ui-auto-dark-detection.md) | T-036 | Popup 现代化：Radix UI + 嫦娥品牌 + Auto 智能检测 | ✅ |

### 设计记录

| RFC | 任务 | 标题 | 状态 |
|-----|------|------|------|
| [023](./docs/rfc/completed/023-dynamic-color-engine-pipeline.md) | T-035 | Dynamic 配色管线：采样、聚合语义讨论 | ✅ |

---

## 当前进行中 / Backlog

> 以下项尚无独立 RFC，下一个从 **025** 起编号。

| 方向 | 说明 | 优先级 |
|------|------|--------|
| **E2E 测试** | 加载未打包扩展 → 打开页面 → 断言注入/存储行为 | 高 |
| **Chrome Web Store 上架** | 打包、隐私政策、审核素材与说明 | 中 |
| **Auto 暗检测阈值配置化** | 当前亮度阈值 `luma < 80` 写死；考虑 per-site 覆盖或用户可调 | 低 |
| **Auto + filter-css/filter-plus 暗检测** | RFC 024 仅覆盖 Dynamic 模式；其他模式与 auto 组合暂不检测 | 低 |

---

## 已完成阶段总结

### Phase 0 — 基线
Monorepo 架构、Rust/WASM 工具链、MV3 Chrome 扩展宿主、CI 流水线（RFC 001）。

### Phase 1 — 核心能力
策略存储与迁移、内容脚本采样引擎、WASM 批颜色计算、Popup UI、四种主题模式（Dynamic/Static/Filter/Filter+）、滤镜滑块、站点列表与快捷键、Only for 按站覆盖、字体/描边、每站自定义 CSS（RFC 004–019）。

### Phase 2 — 质量与发布（进行中）
GitHub Pages 落地页（RFC 020）、Popup Solarized Dark 配色（RFC 022）、Popup 现代化重构（RFC 024）。
