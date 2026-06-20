# RFC 033 — 跨站点表面修复层（Surface Repair Layer）

| 字段 | 值 |
|------|-----|
| 状态 | **Under Review**（实现中） |
| 任务 ID | **T-046** |
| 创建日期 | 2026-06-08 |
| 基线 RFC | [031](./completed/031-dynamic-recolor-engine.md)、[006](./completed/006-content-script-sampling-budget-fallback.md)、[032](./completed/032-theme-mode-product-consolidation.md) |

---

## 1. Summary

RFC 031 负责 **「改色」**（stylesheet 文本 → WASM `modifyColor` → 覆盖注入）。本 RFC 定义与之正交的 **「表面修复」** 层：在 recolor 覆盖不到或来不及覆盖的缝隙上，用 **computed-style 启发式 + 预算化 inline 铺底** 消灭漏网浅底，且 **不破坏透明 layout / 背景图**。

目标：从「单站 allowlist（gmp-page、h-c-*）」升级为 **跨站点可复用的三层修复管线**，减少每站手写选择器。

---

## 2. Motivation

### 2.1 RFC 031 管什么、不管什么

| 能处理 | 不能 / 难以及时处理 |
|--------|---------------------|
| 同源 `styleSheets` 内颜色 longhand / `background` / `border` 简写 | 跨域 stylesheet（SecurityError，规则不可读） |
| 内联 `element.style` 颜色 | `var(--token)` 未解析的声明（Phase 1 静态重写局限，见 031 §3.2） |
| 渐变色标、部分 `box-shadow` | **仅 border 造视觉白条**（如 `.gmp-page { border-left: 24px solid #fff }`）在简写支持前漏改 |
| MO 增量重建覆盖层 | 首屏后插入、fold 下区块、滚动才出现的浅底 |
| | **透明 wrapper 下的实色根**（`main` 白底 + `.h-c-page` 透明）需穿透采样 |

### 2.2 反面教材（本 RFC 明确禁止）

1. **宽匹配铺底**：`[class*="h-c-"]`、`section, nav, div` 全铺 → 透明壳变实心块，破坏 hero 渐变/层叠。
2. **`background` 简写 inline 铺底**：清掉 author `background-image`。
3. **无预算全文档 query**：主线程卡顿，违背 RFC 006。

---

## 3. 引擎总览：双轨 + 三层修复

Dynamic 强制暗色在 content script 内是 **双轨并行**：

```
                    ┌─────────────────────────────────────┐
                    │         applyForcedDark / runPaint   │
                    └─────────────────────────────────────┘
                                        │
              ┌─────────────────────────┴─────────────────────────┐
              ▼                                                   ▼
   ┌──────────────────────┐                          ┌──────────────────────┐
   │  A. Recolor 轨       │                          │  B. Surface 修复轨    │
   │  (RFC 031)           │                          │  (本 RFC)             │
   │  packages/           │                          │  apps/chrome/content  │
   │  dynamic-recolor     │                          │  + extension-settings │
   └──────────────────────┘                          └──────────────────────┘
              │                                                   │
   收集 cssRules → 改色 → 注入 #change-dark-style          三层修复（见 §4）
   + 内联 style 改写 + 背景图亮度 + MO 增量
              │                                                   │
              └─────────────────────────┬─────────────────────────┘
                                        ▼
                          html[data-change-dark-root] + 暗色观感
```

**A 轨** 是主路径（批量、可测试、WASM 热点）。**B 轨** 是缝隙填充（computed DOM、有预算、可关闭清理）。

回退：A 轨失败时仍用 RFC 023 采样单色 + `buildStaticDarkCss` 铺 `html/body/main`（`index.ts` `buildSampledPalette`），B 轨同样叠加。

---

## 4. 三层表面修复（Tier 1 → 3）

执行顺序（`applyDynamicSurfaceFloor`）：

| Tier | 名称 | 机制 | 包 / 模块 |
|------|------|------|-----------|
| **1** | 壳层铺底 | `body` 无条件；地标节点在 **实色浅底** 时铺 `background-color` | `page-surface-floor.ts` |
| **2** | 可见扫描 | 地标 + 启发式 query；`shouldPaint*` 过滤 | `visible-light-surface-sweep.ts` |
| **3** | 视口穿透采样 | `elementsFromPoint` 网格 + **gutter/列边界** 探针；穿透透明栈 | `document-light-surface-sweep.ts` |

滚动 / resize：**debounce resweep**（Tier 2 + 3）。MO flush 后：**重跑 Tier 1–3**（`recolor-observer.ts`）。

### 4.1 铺底写法（不变式）

- 只写 `background-color: <pageBg> !important`（`paintLightSurface`）。
- 标记 `data-change-dark-surface-floor` 便于 `clearPageSurfaceFloor` 清理。
- **禁止** inline `background` 简写。

### 4.2 是否铺底：统一判定 `shouldPaintOpaqueLightSurface`

Pipeline（`light-surface-utils.ts` + `surface-heuristics.ts`）：

```
输入: HTMLElement el
  │
  ├─ shouldSkip? (media, form controls, buttons) → 否
  ├─ hasAuthorBackgroundImage? → 否（保留渐变/位图）
  ├─ background-color alpha < 0.92? → 否（透明 layout）
  ├─ computed luma ≤ 200? → 否（已够暗）
  │
  └─ 是则看「铺底资格」任一满足：
        • isSurfaceLandmark (body/main/header/footer/[role=main|banner|contentinfo])
        • hasSurfaceComponentClassHint (BEM __bar/__box、*-footer、hero、navbar…)
        • isSignificantVisibleLightPanel (视口内面积 ≥ 8000px² 且 min 边 ≥ 120×40)
```

**不再依赖** 站点硬编码 `[class*="gmp-page"]` 作为唯一手段；GMP 案例由「地标 + `__text-box` class 线索 + border recolor」组合覆盖。

### 4.3 Tier 3 穿透算法（要点）

对每个采样点 `(x,y)`：

1. `stack = document.elementsFromPoint(x,y)`
2. 自顶向下遍历，**跳过** 不满足 `shouldPaintOpaqueLightSurface` 的节点（透明穿透）
3. 命中第一个可铺节点 → `paintLightSurface` → **该点停止**（避免同栈重复铺透明父级）

Gutter 探针：视口左右 inset、`main.getBoundingClientRect()` 左右 ±4px/±20px，专抓 **border 白条 / 列缝**。

---

## 5. Recolor 轨扩展（与 031 共用，本 RFC 收口）

以下归入 `dynamic-recolor`，作为 031 §2.6 的补充实现：

| 声明 | 模块 | ColorUse |
|------|------|----------|
| `border*` / `outline` 简写 | `border-css.ts` | `border` |
| `box-shadow` | `box-shadow-css.ts` | `border`（语义：扩散阴影，同 031 §2.6） |
| `background` / `background-image` 渐变 | 已有 `background-image-css.ts` | `bg` |

**案例**：`@media (min-width:1441px) { .gmp-page { border-left:24px solid #fff } }` → recolor 改写 border 色，消除竖白条根因。

---

## 6. 与 RFC 006 预算墙

所有 Tier 2/3 扫描受 `SamplingBudget`（`maxNodes` / `maxMs`）约束：

- `computeDeadlineMs` + `isPastDeadline` 时间墙
- 节点计数上限，防止巨型 DOM 卡死

Tier 1 仅少量地标 query，默认不计入 heavy scan。

---

## 7. 包边界

| 包 | 职责 |
|----|------|
| `@change-dark/dark-engine` | WASM `modifyColor` / `batchModifyColors` |
| `@change-dark/dynamic-recolor` | Recolor 轨：解析、改色、注入、MO、内联、背景图 |
| `@change-dark/injected-styles` | `buildStaticDarkCss` / `buildRecolorDynamicCss`、`<style>` 节点 |
| `@change-dark/extension-settings` | `surface-heuristics.ts` 常量与纯函数 |
| `apps/chrome/src/content` | Surface 轨编排、`applyForcedDark` |

---

## 8. 已知局限

| 项 | 说明 |
|----|------|
| `var(--x)` | 仍依赖 031 Phase 1.5 计算值路径；B 轨可部分用 computed 铺底兜底 |
| 跨域 CSS | 规则不可读；B 轨靠 computed 扫描补洞 |
| Shadow DOM | 不穿透（同 031） |
| 极大浅色面板 | 面积启发式可能漏极小缝；靠 Tier 3 加点密度缓解 |
| 误铺风险 | 大面积浅色 **卡片** 可能被 Tier 2 铺底 — 接受度优于满屏闪白；后续可加「卡片」负向启发式 |

---

## 9. Tasks

| ID | 内容 | 状态 |
|----|------|------|
| T-046-1 | `surface-heuristics.ts` 地标 / class / 面积启发式 | ✅ |
| T-046-2 | 三层 sweep + scroll resweep + MO 联动 | ✅ |
| T-046-3 | `border-css` / `box-shadow-css` recolor | ✅ |
| T-046-4 | 单测：heuristics、sweep、GMP CSS golden | 🔄 进行中 |
| T-046-5 | E2E：marketingplatform.google.com 回归 | ⏳ |
| T-046-6 | Phase 2：`var()` 计算值 / 站点 profile 负向规则 | ⏳ Deferred |

---

## 10. 验收

1. GMP Analytics 页：无左右 `#fff` border 竖条；hero 背景图保留；透明 `.h-c-page` 无实心铺底。
2. 通用页：`footer` / 大白底 `section` 在 scroll 后被修复。
3. 关闭扩展：`clearPageSurfaceFloor` + 移除 `#change-dark-style` 恢复原貌。
4. 性能：单次 sweep 在默认 budget 内完成，无长时间 Long Task。

---

## 11. 参考实现路径

- `packages/extension-settings/src/surface-heuristics.ts`
- `apps/chrome/src/content/light-surface-utils.ts`
- `apps/chrome/src/content/page-surface-floor.ts`
- `apps/chrome/src/content/visible-light-surface-sweep.ts`
- `apps/chrome/src/content/document-light-surface-sweep.ts`
- `packages/dynamic-recolor/src/border-css.ts`
- `packages/dynamic-recolor/src/box-shadow-css.ts`
