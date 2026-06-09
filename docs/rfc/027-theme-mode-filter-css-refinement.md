# RFC 027 — Filter（CSS）模式：语义澄清与精炼路线图

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-040** |
| 创建日期 | 2026-04-19 |

**基线（已实现，不本文档取代）**：[RFC 013](./completed/013-theme-mode-filter-css-invert.md)（产品行为）、[RFC 011](./completed/011-theme-filter-sliders.md)（滤镜链）、[RFC 025](./completed/025-policy-mode-behavior-matrix.md)（Auto × 模式）。

**对照**：与 Filter+ 的差异见 [RFC 028](./028-theme-mode-filter-plus-refinement.md)。

---

## 1. Summary

在 RFC 013 已锁定的实现之上，用一篇**精炼规格**统一回答：Filter 的「准确性」指什么、用户常见误解来自哪里、以及后续可改进项的**验收口径**。目标是把「整页反相系暗色」与「按 DOM 重配色（Dynamic/Static）」的边界写清楚，便于支持文档与 issue  triage。

---

## 2. 「准确性」在本模式下的定义

**Filter 不做**「按站点语义重新选色」；**它做**的是：在 sRGB 管线内对整棵渲染树施加固定的 `invert(1) hue-rotate(180deg)`（`FILTER_CSS_INVERT_CHAIN`，见 `packages/shared/src/constants.ts`），并对 `buildFilterInvertMediaSelectorList` 列出的 replaced / 像素型节点再套一层同链以抵消二次染色（与 [RFC 013](./completed/013-theme-mode-filter-css-invert.md) 实现表一致，含 `audio` / `video` / `object` / `embed` / `iframe` / `[role="img"]` 等）。

因此：

- **行为上「正确」**：根元素与媒体补偿规则按规格注入；与 RFC 011 链组合时顺序符合 `buildFilterInvertCss` 约定。
- **观感上「不像用户想象的暗色主题」**：不等于实现错误；常见于已是暗底的原生页被反相变亮、或复杂混合模式 / 滤镜堆叠——属于反相家族的**已知语义**。**缓解（2026-04-19）**：原生暗页下 **Filter / Filter+ 不注入**（`on` 亦禁止反相）；**`auto`** 下原生暗页 **全模式不注入**（RFC 025）。**`on`+原生暗** 仍可对 Dynamic/Static 走非反相上色。

### 2.1 与「页面配色 / Page palette」的关系（精确定义）

Filter **不**把整站重绘成 Dynamic 那套语义上色；**但**须尊重用户在 Popup 中选的 **页面调色板**（`dark` vs `solarized-dark`，与 Static/Dynamic 同源存储）在 **壳层与反相挂载点** 上的行为：

| `pagePalette` | 行为摘要 |
|---------------|----------|
| `dark`（默认） | 与 RFC 013 历史一致：整页反相链挂在 `html[data-change-dark-root]`；**不在本路径做页面采样 / WASM**。 |
| `solarized-dark` | `html[…]` 固定 base03/base1（与 `SOLARIZED_PAGE_*` 常量一致）；反相链挂在 **`body`**，媒体补偿选择器前缀为 `html[…] body …`，避免壳色与反相叠在同一节点导致观感脱离 Solarized。 |

实现入口：`resolveFilterCssInjectionScope` + `buildFilterInvertCss(themeFilters?, pagePalette?)`；内容脚本 **`THEME_MODE_FILTER_CSS` 分支必须传入 `readEffectivePagePaletteForPage()`**（与 Static 分支同源），否则 Solarized 在运行时无效。

**已暗判定（与 Filter 解耦）**：`isNativelyDarkFromHtmlBodyBackgrounds` + `parseComputedBackgroundLuma`（`packages/shared/src/native-dark-surface.ts`），与内容脚本暂时剥离 `ROOT_ATTR` 的采样方式见 RFC 025。

### 2.2 开发者提示：新增 / 修改内容脚本导入时

凡在 `applyForcedDark` 链路增加**会写页面底/字色或 Filter 壳层**的代码，必须同时：

1. 读取并传入 **`readEffectivePagePaletteForPage()`**（与 Popup「页面配色」一致：`dark` 与 `solarized-dark` 行为不同，不可省略第二参数或硬编码调色板）。
2. 遵守 **RFC 025**：`auto`+原生暗全跳过；`on`+原生暗仅禁止 Filter/Filter+，Dynamic/Static 仍可能注入。

`apps/chrome/src/content/index.ts` 文件头注释为摘要真源之一；与本节冲突时以**实现 + RFC 025**为准并回写文档。

---

## 3. 与 Filter+（RFC 014）的正交与重叠

| 维度 | Filter（本文档范围） | Filter+ |
|------|---------------------|---------|
| 数学语义 | 反相 + 180° 色相旋转 | 同语义（`feColorMatrix` + `feHueRotate`），见 `filter-plus-svg.ts` 注释 |
| 管线 | 纯 CSS `filter` | `filter: url(#id)` 引用页内 SVG |
| 典型差异来源 | 浏览器对 CSS filter 的合成与亚像素 | Chromium 上部分站点色彩合成与内联 SVG 边界处理略有不同 |

两模式均为「亮界面 → 暗观感」的反相族，**不是**一亮一暗对偶。

---

## 4. 精炼目标（待排期实现）

以下项可在不改变 RFC 013 核心语义的前提下分阶段落地；每项应附带 **Vitest / 快照或 E2E（RFC 026）** 或人工矩阵一行。

1. **文档与 Popup 文案**：**已实现（2026-05-17）** `apps/chrome/src/popup/i18n.ts` + `App.tsx`：`themeModeHint`、各模式 `title` 说明反相语义与 RFC 025 原生暗规则。
2. **iframe / shadow 边界**：**已实现（2026-04-19）** 父文档中对 `iframe` 元素的媒体补偿选择器；**最小 fixture（2026-05-17）** `apps/chrome/fixtures/filter-invert-parent-iframe.html`；E2E 仍待 RFC 026。**shadow DOM** 与跨域子文档限制不变（RFC 013）。
3. **与 RFC 011 非中性组合**：为「媒体再反相仅抵消基链」补充 1～2 个视觉回归用例（可选截图比对流程）。
4. **页面调色板与 Filter**：**已实现（2026-04-19）** 见 §2.1；单测 `packages/shared/src/__tests__/css.test.ts`（Solarized 分支）。

---

## 5. Non-goals

- 不将 Filter 改为 **基于页面像素采样 + WASM** 的主题引擎（那是 Dynamic）；**`pagePalette === dark` 时不在 Filter 路径注入采样得到的 `pageBg`/`pageFg`**（若未来要「壳色跟 Dynamic 一致」，须单独 RFC：Filter 分支采样与性能/Auto 交互）。
- 不承诺修复所有浏览器 `filter` 引擎差异。

---

## 6. 风险

| 风险 | 缓解 |
|------|------|
| 用户期望「每个站点都像原生暗色」 | 产品文案 + 默认模式保持 Dynamic |
| 文档与实现漂移 | 代码注释引用 RFC 027；改动同步本文件 Decision log |

---

## 7. Decision log

- 2026-04-19：新建 Draft，作为 RFC 013 的精炼与验收补充层。
- 2026-04-19：**已实现** 媒体补偿扩展：`packages/shared/src/css.ts` 中 `buildFilterInvertMediaSelectorList`；RFC 013 / RFC 014 实现表与单测已同步。
- 2026-04-19：补充 **`audio`**（与 `video` 同为 HTML replaced 媒体），并增加 `buildFilterInvertMediaSelectorList` 专用单测。
- 2026-04-19：§2.1 **页面调色板**：`buildFilterInvertCss` 第二参数、`resolveFilterCssInjectionScope`、内容脚本传入 `pagePalette`；RFC 013/014 实现表与 Decision log 已同步。
- 2026-04-19：**原生已暗**：`auto` 全跳过；`on` 仅跳过反相族（Filter/Filter+）；RFC 025 矩阵已对齐。
- 2026-04-19：§2.2 与 RFC 025 同步 **`on`+原生暗** 矩阵；`content/index.ts` 增加注入约定注释（palette + 策略）。
- 2026-05-17：Popup §4.1 文案与 `title` 提示；iframe 手工 fixture；Solarized 分支单测断言 `body iframe` 前缀。
