# RFC 029 — Dynamic 模式：「不可总准」根因表与精炼路线图

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-042** |
| 创建日期 | 2026-04-19 |
| 更新日期 | 2026-06-06 |

**基线**：[RFC 012](./completed/012-theme-mode-dynamic.md)、[RFC 006](./completed/006-content-script-sampling-budget-fallback.md)、[RFC 005](./completed/005-wasm-batch-color-api.md)、[RFC 023](./completed/023-dynamic-color-engine-pipeline.md)（管线语义）、[RFC 025](./completed/025-policy-mode-behavior-matrix.md)。

---

## 0. 方向修订（2026-06-06）—— 采样 2 色法已到天花板

> 本节是 2026-06-06 对照赛道 winner（Dark Reader）重新学习后的**根本性结论**，优先级高于 §1–§4 的「在现有路径上精炼」叙事；下述各节作为历史与过渡背景保留。

**核心判断**：当前 Dynamic 的「效果不好」**不是采样不准的问题，而是架构选型到顶了**。

现状实现（`apps/chrome/src/content/index.ts` Dynamic 分支）的本质是：

```
采样若干 background-color 样本 → k-means 聚合出「一个」基色 → 全站铺「一个 pageBg + 一个 pageFg」
```

这与 `paintStaticPath` 共用 `buildStaticDarkCss`，差别仅在基色来源（采样 vs 固定）。即：

- **本仓库的 Dynamic ≡「会自动取色的 Static」**，是**全局单一配色**。
- **Dark Reader 的 Dynamic ≠ 同物**：它**逐条 CSS 规则、逐个颜色值**重写（背景/文字/边框/阴影/SVG fill/背景图），在 HSL 空间按亮度曲线变换后生成等价暗色 CSS 覆盖回页面。是**逐色翻译**，不是**全局铺色**。

一个站点有几百种颜色（卡片、按钮、tag、代码高亮、边框、分隔线…）。用**两个颜色**去铺，必然丢失层次：要么糊成一片，要么对比度错乱。这是**信息量天花板**，调采样阈值（§4 回退层精炼）无法突破——RFC 023 整篇在优化「怎么取那一个主色更准」，但**主色准不准不是症结，单色铺全站才是**。

**已对照确认（不改本仓库已做对的部分）**：Filter / Filter+（[RFC 027](./027-theme-mode-filter-css-refinement.md) / [RFC 028](./028-theme-mode-filter-plus-refinement.md)）是纯 CSS/SVG 反相技巧，与 Dark Reader 的 Filter / Filter+ **语义一致，无需返工**。需要返工的只有 Dynamic。

**修订后的方向**：把 Dynamic 重做为**逐规则改色引擎**（`modify-css` + `modify-colors`）；现有「采样 → 单色」路径**降级为回退/Static**，不在 `dark` 调色板下再作为 Dynamic 主路径。

> **引擎规格独立成文 → [RFC 031](./completed/031-dynamic-recolor-engine.md)（T-044，Phase 1 ✅）**：`modifyColor` 颜色变换（核对真源常量）、引擎管线、Phase 1 对齐 DR / Phase 2 Rust 反超、性能基准门槛、写代码前 blockers。本 RFC（029）只负责**判定旧采样单色路径到顶**，不再承载新引擎规格（Linus review：一文一职）。

---

## 1. Summary（采样单色路径 = 回退层的精炼）

> **定位（2026-06-06）**：§1–§6 描述的是**采样 → 单色**路径。§0 已判定它**不再是 Dynamic 主路径**（主路径见 [RFC 031](./completed/031-dynamic-recolor-engine.md) 逐规则改色引擎）。但该路径**作为 RFC 031 §3 的回退层保留**（stylesheet 跨域/拿不到时退此），故以下精炼仍有效——只是服务于**回退质量**，不再代表目标架构。

采样单色路径的「不准」在多数场景下是**路径与信息论约束**（能采到的像素有限、首屏未完成、透明叠层、Canvas 等），而非单一 bug。本节把**主导误差层**分类，给出回退层的可操作精炼方向，作为 RFC 012/023 的实现向补充。

---

## 2. 「准确性」分层模型

维护 issue 时优先标注层级，便于回到根因而非对症改色。

| 层级 | 典型现象 | 主导因素 |
|------|----------|----------|
| L1 采样 | 顶栏与主区亮度冲突、代表色飘 | 视口分区权重（见 `sampling.ts` 注释）、样本量、透明继承 |
| L2 聚合 | 突然像 Static、色温跳变 | k-means 簇质量、暗簇比例阈值、RFC 023 讨论的分位回退 |
| L3 预算 / 调度 | 首屏后才稳定 | RFC 006 idle 预算、回退到 Static 调色 |
| L4 落地 | 个别块仍亮/仍暗 | WASM 混合、CSS 变量作用域、与 RFC 011 根 filter 的组合 |
| L5 策略 | 原生暗页被误注入或反例 | RFC 025：`html`/`body` computed 背景与 `ROOT_ATTR` 临时移除逻辑 |

---

## 3. 用户沟通口径

> **更新（2026-06-06）**：Dynamic 的对外语义改为 **RFC 031 逐规则改色引擎**（解析站点 CSS 逐色翻译成暗色），**不再是**「采样代表色铺底」。下表「采样单色」口径仅描述 §1 回退层。

- **Dynamic（主路径，RFC 031）**：解析页面样式表，对每个颜色按用途（背景/文字/边框）做暗色变换 → 保留站点层次与色相。对「站点声明的颜色」负责。
- **Dynamic 回退层（本 RFC §1，采样单色）**：样式表跨域/拿不到时退化为「采样代表色铺底」；语义随当前帧背景变化，无层次。仅兜底。
- **Static**：固定调色板 + 有限选择器覆盖；语义稳定但易漏非常规 DOM 块。

三者都不是整页反相；与 Filter/Filter+ 的混淆见 RFC 027/028。

---

## 4. 精炼目标（工程）

每项需指向可测指标（单元常量、golden 向量或 E2E 页面 fixture）。

1. **分层诊断**：在 debug 路径输出当前选用的聚合分支（例如 darker centroid vs k=1 vs static fallback），便于对照 RFC 023 决策表。 — ✅ `dynamic-fallback.ts` 的 `resolveDynamicBaseRgbWithBranch`（2026-06-07）。
2. **采样稳健性**：评估是否增加「首屏后二次轻量采样」开关（默认关），文档写明电量与闪烁风险。
3. **回退连贯性**：超预算回退 Static 时，避免与用户显式选 Dynamic 的预期冲突（仅 UI 文案或一次性 toast 级别，不改变 RFC 006 默认行为除非另开 RFC）。

---

## 5. Non-goals

- 不在本文档定义新的主题模式。
- 不承诺对任意 Canvas/WebGL 内容语义着色。

---

## 6. 风险

| 风险 | 缓解 |
|------|------|
| 诊断日志泄露页面结构 | 仅 debug build；正式包无日志 |
| 二次采样引起闪屏 | 默认关闭；需 RFC 级 UX 评审 |

---

## 7. Decision log

- 2026-04-19：新建 Draft，归纳 Dynamic「准确性」根因与精炼 backlog。
- 2026-06-06：**方向修订**（§0）。对照 Dark Reader 重新学习后判定：当前 Dynamic（采样 → k-means → 全局 2 色铺）≡「自动取色的 Static」，受**单色铺全站**的信息量天花板限制，调采样阈值无法突破「效果不好」。新目标为**逐规则改色引擎**，采样单色路径降级为回退。Filter/Filter+ 经对照与 winner 语义一致，**不返工**。**本次仅更新 RFC，未改任何代码。**
- 2026-06-06：**拆分**（Linus review：一文一职）。引擎规格（`modifyColor` 算法、管线、Phase 1/2、Rust/WASM、blockers）从本 RFC §0.1–0.5 **移出 → [RFC 031](./completed/031-dynamic-recolor-engine.md)（T-044）**。029 仅保留「旧采样单色到顶」的根因判定。
- 2026-06-07：**§4.1 分层诊断落地**。`apps/chrome/src/content/dynamic-fallback.ts` 暴露 `DynamicFallbackBranch`；`paintSampledFallbackPath` 共用。二次采样/回退连贯性仍待办。
- 2026-06-06：**修正**。旧 §0.1 背景中性阈值误写 `S < 0.12`，核对真源 `modify-colors.ts` 为 `S < 0.24`；正确值见 RFC 031 §2.4。

---

## 8. References

- 新引擎规格与算法 → **[RFC 031](./completed/031-dynamic-recolor-engine.md)**（含核对真源的 `modifyColor` 常量与色相区间）。
- Dynamic vs Filter 模式官方说明：<https://darkreader.org/blog/dynamic-theme/> 、<https://darkreader.org/blog/filter-mode/>
