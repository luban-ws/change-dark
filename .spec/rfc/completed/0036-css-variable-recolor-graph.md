# RFC 0036 — CSS 变量改色图（对齐 Dark Reader VariablesStore）

| 字段 | 值 |
|------|-----|
| 状态 | **Implemented** |
| 任务 ID | **T-049** |
| 创建日期 | 2026-09-20 |
| 基线 | [0031](0031-dynamic-recolor-engine.md)、[0033](0033-cross-site-surface-repair-layer.md)、[0034](0034-site-profile-catalog.md) |
| 对照源码 | Dark Reader `src/inject/dynamic-theme/variables.ts`（`VariablesStore`） |
| 相关 issue | DR [#2583](https://github.com/darkreader/darkreader/issues/2583)；本仓库 P1-6 已知限制 |

**Status:** Implemented

---

## Summary

把 Dynamic recolor 从「跳过 `var(--*)` / 只改写 `light-dark()` 定义」升级为 **CSS 变量图改色**：推断变量用途（bg / fg / border），改写**定义**与**用法**，使 design-token 站点不再留下浅灰底 / 灰字，并与 `--cd-page-bg|fg|border` 主题契约对齐。

本 RFC 落实 031 §3.2 所述 **Phase 1.5**（变量路径），纠正「与 DR #2583 同档 = 可不做」的误读：DR 主路径已是变量图静态重写，不是放弃变量。

---

## Problem

### 用户可见症状

- 强制暗色后部分表面仍为**浅灰 / 浅底**，与 Solarized / 采样 `--cd-page-bg` 不一致。
- 正文对比度差（灰上灰），UI 难读。

### 根因（代码级）

| 缺口 | 现状 | 后果 |
|------|------|------|
| 用法 `var(--x)` | `getRecolorSkipReason` → **CSS_VAR 跳过** | 作者色原样显示 |
| 定义 `--x: #f5f5f5` / `oklch(...)` | `colorUseForCssProperty` 仅 longhand；`--*` 只处理 `light-dark()` | token 定义不进 palette / WASM |
| Surface repair | `LIGHT_SURFACE_LUMA=200` + allowlist | 中浅灰 / 非 landmark 漏铺；治标不治本 |
| 文档 | 031 P1-6「与 DR 同档」 | 低估 DR `VariablesStore`，推迟真修 |

现代站（Tailwind v4、Cloudflare Kumo、Radix 等）颜色几乎全走 custom properties → Phase 1 静态 longhand 改色经常打空。

### 为何不能只靠 033

Surface Repair（033）用 computed 启发式铺 `var(--cd-page-bg)`，故意窄匹配防透明壳误伤。它**补缝**，不能替代变量图：跨域 sheet、复杂 `var()` 链、中灰阈值以下的表面仍漏。

---

## Goals

1. **定义改写**：可读 stylesheet 内、可解析的中性 `--*` 颜色定义 → 绑 `--cd-page-*` 或经 WASM `modifyColor`（按推断用途）。
2. **用法改写**：`background-color` / `color` / `border*` 等上的简单 `var(--name)` → 指向已改定义，或等价包装变量（见 Design）。
3. **用途推断**：从属性用法（及可选命名启发）标注 `bg` / `fg` / `border`，对齐 DR `VAR_TYPE_*`。
4. **保留现有契约**：主题仍以 `--cd-page-bg|fg|border` 为单一 preset；`light-dark()` 路径并入变量图，不删。
5. **可测**：纯函数图构建 + 改写；fixture「`--bg:#f5f5f5` + `.x{background:var(--bg)}`」→ 计算色等于 theme bg。
6. **预算**：复用 RFC 0006；图构建在可读 sheet 收集之后、注入之前；超预算则部分变量留待 idle 续跑，不整页回退。
7. **保留站点变量语义**：作者变量 `--x` 保持原值；暗色输出写入扩展私有变量，并按用途改写消费者。一个变量可同时用于背景、文字和边框，各用途独立输出。

## Non-goals

- 不引入 DR 的 `--darkreader-*` 命名为对外契约（可内部包装，对外优先直接覆写 `--*` → `var(--cd-page-*)`）。
- 不在本 RFC 做跨域 stylesheet fetch（031 §6 另开 RFC）。
- 不穿透 Shadow DOM / `adoptedStyleSheets`（031 已知限制，另 RFC）。
- 不解析元素 `style` 属性中的自定义属性图；RFC 0031 已有 inline literal recolor，本 RFC 只处理可读 stylesheet。
- 不承诺 Gmail / Google Calendar 完整兼容。它们的残余问题可能还涉及 Shadow DOM、`adoptedStyleSheets` 或站点专用修补；本 RFC 只补可读 stylesheet 中的 CSS 变量路径。
- 不替代 033 Surface Repair；变量图落地后可收紧 repair 阈值，但不删除。
- 不做逐元素 `getComputedStyle` 全页扫作为主路径（031 已否决为 Phase 1 主干；本 RFC 主路径仍是**静态规则图**）。

---

## Design

### 相对 Dark Reader

| 维度 | Dark Reader `VariablesStore` | 本 RFC（嫦娥） |
|------|------------------------------|----------------|
| 类型推断 | 收集属性用途和变量依赖；一个变量可有多个用途，类型变化可触发重新生成 | 同构：`bg` / `fg` / `border`；多用途保留为多个用途，不做单值覆盖 |
| 定义输出 | 按用途生成包装变量，例如 `--cd-recolor-bg--x`，不覆盖站点 `--x` | 用扩展私有变量承载转换结果；原始定义继续供页面 JS 和未转换样式读取 |
| 用法输出 | `var(--x)` → 按用途引用对应包装变量；跟踪嵌套依赖和 fallback | 改写消费者声明；不能把原始定义直接绑定到单一 palette 色 |
| 主题 | DR theme 对象 | 已有 `ResolvedThemePalette` + `--cd-page-*` |
| 批改色 | TS `modify*` | **Rust/WASM `batchModifyColors`**（031） |
| 运行时更新 | 重新收集新增或变化的规则与 inline variables，并刷新依赖类型 | 复用现有 stylesheet 重建入口；元素 `style` 属性中的自定义属性图不在本 RFC 范围 |
| 未知类型 | 保留未解析引用，后续规则到达时重新判型 | 未知、循环或不稳定值跳过并计数，不猜颜色用途 |

Dark Reader 源码还把 Shadow DOM、`adoptedStyleSheets` 和站点 fixes 放在变量图之外的样式管理层。本 RFC 不复制这层；它解释了为什么变量图不能单独承诺 Gmail / Calendar 全站覆盖。

### 管线位置

```
collectReadableStylesheetCssTexts
  → buildCssVariableGraph(cssChunks)          ← 本 RFC
  → rewriteVariableDefinitions + dependents   ← 本 RFC
  → collectRecolorOverrideRules (既有 longhand / light-dark)
  → mergeRecolorStyleText(base, overrides, themeShell)
```

变量图规则与既有 override **合并注入** `#change-dark-style`；选择器前缀仍遵守 `prefixRecolorOverrideSelector`（禁止 `html[…] :root`）。

### 最小可交付切片（S0 → S2）

| 步 | 范围 | 验收 |
|----|------|------|
| **S0** | 图：收集定义、引用、fallback 和属性用途；用途用集合表达，保留未知与多用途节点 | 单测：节点、依赖边、多用途和后置定义重判正确 |
| **S1** | 可解析中性定义按用途输出私有包装变量；不覆盖作者 `--*`；`:root` / 选择器前缀正确 | 浅灰背景绑定 page bg；同变量的文字用途仍绑定 page fg |
| **S2** | 改写简单 `var(--name)`、嵌套变量和 fallback 消费者；无法安全改写的构造色跳过 | `.card{background:var(--bg)}` 及依赖链通过 DOM/computed 测 |

S3+（另任务或本 RFC 后续节）：构造色 `rgb(var(--r)…)`、元素 `style` 属性中的自定义属性图、与 034 `cssVarSubstitute` 合并策略。变量用途后续变化由 S0/S2 的重判行为覆盖；循环引用在 S0/S2 中检测并安全跳过。

### 与 034 catalog

`recolor.cssVarSubstitute` 仍为**站级逃生舱**。通用变量图覆盖主干后，catalog 只保留引擎旋钮搞不定的特例；本 RFC 不删除该字段。

### 风险与缓解

| 风险 | 缓解 |
|------|------|
| 误把品牌色当中性 bg | 沿用 `isNeutralPaletteCandidate`；饱和色走 WASM 非 palette 绑 |
| 改写 `--*` 破坏站点 JS 或共享变量语义 | 不覆盖作者变量；扩展私有包装变量按用途隔离 |
| 图构建主线程成本 | RFC 0006 预算；先同源可读 sheet；超额 idle |
| 与 light-dark 双重改写冲突 | 单一 `planDeclarationRecolor` 入口：light-dark → 图 → longhand |
| Gmail / Calendar 残余样式超出当前文档规则范围 | 明确不承诺完整兼容；先用页面证据定位问题，再分别评估 Shadow DOM、adopted sheets 或 034 站点 profile |

---

## Delivery

| 项 | 说明 |
|----|------|
| 包 | `@change-dark/dynamic-recolor`：新增 `css-variable-graph.ts`（纯函数）+ 接入 `css-stylesheet.ts` / `buildRecolorInjectionFromSource` |
| 内容脚本 | 无新 paint 入口；仍走 `paintRecolorStylesheetPath` |
| 测试 | `packages/dynamic-recolor` vitest：图、改写、`:root` 前缀、浅灰 fixture、多用途变量、依赖链、fallback、原变量保持不变 |
| 文档 | 更新 `CLAUDE.md` site-debug：检查 `--*` 是否出现在 `#change-dark-style`；修正 P1-6「等同放弃变量」表述 |
| 任务 | **T-049** |

实施检查清单（仅 TASK_TRACKING，不写进本文件 checkbox）：

1. S0 图构建 + 单测  
2. S1 中性定义改写 + `:root` 前缀测  
3. S2 简单用法 / 定义覆写生效测  
4. 接入 merge 注入 + 回归 dynamic-recolor / chrome 相关测  
5. 更新 CLAUDE.md / 031 交叉引用（Phase 1.5 本 RFC）

---

## Acceptance

1. Fixture：`:root { --surface: #f0f0f0; } .panel { background-color: var(--surface); }` 在注入后，`.panel` 的 computed `background-color` 与 `--cd-page-bg` 一致（Solarized 或采样均可）。
2. 注入 CSS **不得**出现 `html[data-change-dark-root] :root`。
3. 既有 `light-dark()` / longhand 单测全绿。
4. 品牌色按钮（高 chroma）不被绑成 `--cd-page-bg`。
5. 同一作者变量用于背景和文字时，输出分别使用 page bg 和 page fg 包装值；原作者变量值保持不变。
6. `var(--a, var(--b))` 的依赖与 fallback 用途可解析；循环或未知依赖跳过，不破坏原声明。
7. `pnpm --filter @change-dark/dynamic-recolor test` 通过。

---

## Decision log

- 2026-09-20：用户确认浅灰底不 match theme；对照 DR `VariablesStore` 后立项。specify `deliver 0036` 后 **renumber → 036**（与仓库 033–035 三位编号一致；CLI 要求四位故先 0036）。
- 2026-09-20：主路径选定 **静态变量图**（学 DR），非全页 computed 扫；主题输出优先绑 `--cd-page-*`。
- 2026-10-27：复核 Dark Reader `VariablesStore`、动态样式管理和 Google Workspace fixes。变量用途按集合处理；输出使用扩展私有包装变量，保护站点原变量。Shadow DOM / adopted stylesheet 与 Gmail / Calendar 专用修补保持独立范围。

### 上游参考

- Dark Reader [`variables.ts`](https://github.com/darkreader/darkreader/blob/main/src/inject/dynamic-theme/variables.ts)：用途推断、依赖追踪、变量包装和类型变化订阅。
- Dark Reader [`index.ts`](https://github.com/darkreader/darkreader/blob/main/src/inject/dynamic-theme/index.ts)：动态规则、Shadow DOM、inline style 与 `adoptedStyleSheets` 管理。
- Dark Reader [`dynamic-theme-fixes.config`](https://github.com/darkreader/darkreader/blob/main/src/config/dynamic-theme-fixes.config)：Gmail / Calendar 站点特例；不视为变量图的通用能力。
