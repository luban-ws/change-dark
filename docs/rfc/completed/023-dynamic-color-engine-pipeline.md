# RFC 023 — Dynamic 配色管线：采样、聚合与语义讨论（T-035）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-035** |
| 创建日期 | 2026-03-29 |

依赖：[005](./005-wasm-batch-color-api.md)、[006](./006-content-script-sampling-budget-fallback.md)、[012](./012-theme-mode-dynamic.md)

## Summary

本文档 **不新增产品开关**，而是把 **Dynamic 模式**下「从页面读到代表色 → 再经 WASM/样式表落地」的管线 **说清楚**：每一环在解决什么问题、有哪些 **正交** 备选方案、当前仓库 **采纳了哪条**、**尚未采纳** 的方向留给谁讨论。

**读者**：实现 [RFC 006](./006-content-script-sampling-budget-fallback.md) / [RFC 005](./005-wasm-batch-color-api.md) 的维护者；评审「为何 Kiwanis 类站点顶栏白、主区黑时，Dynamic 仍应偏暗」时的依据。

## Motivation（为何要单独成文）

[RFC 012](./012-theme-mode-dynamic.md) 锁定 **产品行为**（可选 Dynamic、与 Static 互斥等），[RFC 006](./006-content-script-sampling-budget-fallback.md) 锁定 **预算与调度**，[RFC 005](./005-wasm-batch-color-api.md) 锁定 **WASM API 形状**。三者均未用一整节讨论 **「代表色」的语义**：  
输入不是整页位图，而是 **有限个 `background-color` 样本**；若只在 RGB 上做 k=1 均值，浅色顶栏与深色主区会被 **线性平均** 成中灰，与用户对「主内容区很黑」的直觉不符。

本 RFC 把 **因果链** 写清，避免后续只改阈值却不知道为什么。

## Problem statement（症状与根因）

| 层级 | 症状（用户可见） | 根因（工程） |
|------|------------------|--------------|
| 采样 | 缓冲里浅色样本偏多 | 视口上沿命中点多、DFS 易扫到祖先上的浅色背景；**非**「算法叫 k-means」本身 |
| 聚合 | 代表色发灰、发闷 | k=1 或 RGB 空间 k=2 时，**明暗**与 **色度** 混在同一几何里；暗簇均值仍可能被中灰拉高 |
| 后处理 | 黑不够黑 | `mix_toward_black` 等只在已有基色上再压；基色若已灰，只能有限补救 |

结论：**改进应优先作用在「采样分布」与「聚合语义」**，与 RFC 006 的预算墙正交。

## Pipeline（三阶段，职责划分）

```
┌─────────────────────┐    ┌──────────────────────────┐    ┌─────────────────────┐
│ ① 采样（content）   │ →  │ ② 聚合（Rust/WASM）       │ →  │ ③ 后处理（TS+WASM）  │
│ RFC 006 预算内      │    │ kMeansDarkerCentroid 等  │    │ mix_toward_black、   │
│ elementsFromPoint + │    │ dark_color_utils         │    │ suggested_fg 等      │
│ 文档树 DFS          │    │                          │    │ RFC 005              │
└─────────────────────┘    └──────────────────────────┘    └─────────────────────┘
```

- **①**：输出扁平 RGB 缓冲；**不**保证像素均匀覆盖视口，只保证在预算内 **可重复、可终止**。
- **②**：输出 **3 字节基色**；目标语义是 **「主内容偏暗时，基色应落在暗侧」**，而非「全页平均色」。
- **③**：与调色板（如 Solarized）、滤镜链组合；见各专用 RFC。

## Discussion — 备选方案（正交）

以下方案 **可叠加**；同一行内为 **互斥** 的聚合策略对比。

### A. 采样侧

| 方案 | 思路 | 优点 | 缺点 / 风险 |
|------|------|------|-------------|
| **A1 均匀格点** | 固定比例 `elementsFromPoint` | 实现简单 | 顶栏仍占上沿格点，浅样本可偏多 |
| **A2 中下纵带加权** | 增加 `y` 较大的命中点（不改预算语义，只改 **点集**） | 与「主区常在首屏下半」一致，**从根因** 提高暗样本占比 | 主内容在上半屏的少见布局收益小 |
| **A3 带坐标的缓冲** | 每样本附带 `(x,y)`，Rust 内加权 | 最灵活 | 需改缓冲布局、WASM API、迁移成本大 |

**当前采纳**：**A1 + A2**（在 [RFC 006](./006-content-script-sampling-budget-fallback.md) 所述视口多点基础上，增加中下纵带命中点；实现见 `collectPageBackgroundRgbBuffer`）。

### B. 聚合侧（仅谈「从缓冲到 3 字节」）

| 方案 | 思路 | 优点 | 缺点 / 风险 |
|------|------|------|-------------|
| **B1 k=1（RGB 均值质心）** | 单簇代表色 | 稳、便宜 | 顶栏+主区混合时 **必灰** |
| **B2 k=2 于 RGB 欧氏空间** | 两簇后取较暗簇 RGB 均值 | 比 B1 好 | 高饱和色可能按 **色度** 分簇，与「明暗」不一致 |
| **B3 k=2 于 WCAG 相对亮度 L** | 标量 Lloyd，簇内再取 RGB 均值，取 **L 较低** 簇 | 与「浅/深」分层一致 | 两簇均值仍可能偏灰（暗簇内混中灰） |
| **B4 暗尾分位** | 全局按 L 排序，取最暗 `q%` 像素 RGB 均值 | 强压暗 | 全页浅时最暗分位仍浅；照片暗部可能被误当背景 |
| **B5 Otsu 等直方图阈值** | 在 L 直方图上找双峰阈值 | 双峰页可能更优 | 与 Lloyd **并行** 时单峰页可能略偏；由「取更暗」抑制 |

**当前采纳**：**B3** 为主（Lloyd k=2 后 **较暗簇用分通道中位数 RGB**；暗簇像素过少则 **B4** 宽分位替代）；**B5** 与 Lloyd **并行**：`n ≥ 16` 时计算 **Otsu 直方图** 分割下较暗侧 RGB 均值，与 Lloyd 候选取 **相对亮度更低** 者；再 **B4 条件**：较暗簇 RGB 相对亮度仍高于约 **0.22** 时，若 **B4**（最暗约 **28%**）更暗则替换；**B1** 为 **回退**（内容脚本在 `kMeansDarkerCentroid` 失败时调用 `kMeansRgbCentroids(..., 1, ...)`，见 [RFC 006](./006-content-script-sampling-budget-fallback.md)）。

### C. 与 Static / 调色板的关系

- **Static**（[RFC 015](./015-theme-mode-static.md)）**不经过** 本管线聚合。
- **Page palette**（如 Solarized）在聚合 **之后** 覆盖基色；讨论见 [RFC 022](./022-solarized-dark-popup-ui.md) 等。
- **Filter / Filter+**（[RFC 013](./013-theme-mode-filter-css-invert.md) / [RFC 014](./014-theme-mode-filter-plus-svg.md)）**不经** WASM 采样，但内容脚本仍须 **`readEffectivePagePaletteForPage()` → `buildFilterInvertCss` / `buildFilterPlusCss`**，与 Static/Dynamic 的 `colorsForPalette` **同源**（`dark` vs `solarized-dark`）；见 [RFC 027](../027-theme-mode-filter-css-refinement.md) §2.1–§2.2。

## Risks

| 风险 | 缓解 |
|------|------|
| 分位回退把照片阴影当成「页底」 | 阈值与比例写死在 Rust 常量，可测；极端站可转 Static |
| 中下纵带采样误伤「主内容在上方」的站 | 与 A2 缺点相同；后续可用 A3 或配置化 |
| 文档与实现漂移 | 本 RFC **Decision log** 与 [RFC 006](./006-content-script-sampling-budget-fallback.md) **Implementation** 表同步更新 |

## Open questions（留待后续 RFC 或实验）

1. **Otsu 与 Lloyd 的融合策略** 当前为「两候选取更暗」；是否在 **类间方差过低** 时禁用 Otsu，仅信 Lloyd？
2. **暗簇最小像素数**：若暗簇过小，是否强制改用最暗分位或 Static 提示？（已实现 **宽分位** 近似，仍可调 `MIN_DARK_CLUSTER_FRAC`。）
3. **每站覆盖**：是否在 Only for 中允许「采样纵带权重」或「禁用分位回退」？
4. **基准截图矩阵**：与 [RFC 012](./012-theme-mode-dynamic.md) Testing 对齐，固化 Kiwanis 类等回归样例。

## Implementation（落地索引）

| 位置 | 内容 |
|------|------|
| `apps/chrome/src/content/sampling.ts` | 视口命中点（含中下纵带） |
| `apps/chrome/src/content/index.ts` | Dynamic 分支：`kMeansDarkerCentroid` → 失败则 `kMeansRgbCentroids(k=1)` → `STATIC_FALLBACK_RGB` |
| `packages/dark-color-utils/src/lib.rs` | L 轴 k=2、暗簇中位数、Otsu 候选、暗簇过小宽分位、条件暗尾分位、`k_means_darker_centroid_rgb` |
| `packages/dark-engine/src/lib.rs` | `kMeansDarkerCentroid` 等 WASM 导出 |

## Testing

- **Rust**：`dark_color_utils` 单元测试（双簇、分位回退、退化路径）。
- **浏览器**：RFC 012 人工矩阵；本 RFC 不新增自动化 E2E（backlog 见 [RFC 021](./021-project-status-and-backlog.md)）。

## Decision log

- 2026-03-29：立项为 **T-035**；状态 **Approved**；与 005/006/012 **交叉引用**。
- 2026-03-29：记录采纳 **A2 + B3 + 条件 B4 + B5（与 B3 并行取更暗）**，回退 **B1**；**A3**（坐标缓冲）仍为未采纳。
- 2026-03-29：聚合增强 — Lloyd 暗簇 **中位数 RGB**、暗簇过小用宽分位；**Otsu** 与 Lloyd **取更暗候选**；仍保留条件 **B4**。

## References

- [RFC 005 — WASM 批颜色 API](./005-wasm-batch-color-api.md)
- [RFC 006 — 内容脚本采样、预算与回退](./006-content-script-sampling-budget-fallback.md)
- [RFC 012 — Dynamic 模式](./012-theme-mode-dynamic.md)
