# RFC 028 — Filter+（SVG）模式：语义澄清与精炼路线图

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-041** |
| 创建日期 | 2026-04-19 |

**基线**：[RFC 014](./completed/014-theme-mode-filter-plus-svg.md)、[RFC 013](./completed/013-theme-mode-filter-css-invert.md)（语义对齐）、[RFC 025](./completed/025-policy-mode-behavior-matrix.md)。

**对照**：[RFC 027](./027-theme-mode-filter-css-refinement.md)（Filter CSS）。

---

## 1. Summary

RFC 014 已实现 SVG defs 注入、`ensureFilterPlusSvg` 失败降级到 Filter CSS、以及 Firefox 上隐藏 UI 等。本文档把 **Filter+ 的准确性边界**（与 Filter 共享同一数学目标、差异在合成管线）和 **后续精炼项** 单独成文，避免与 RFC 013/023 混读。

---

## 2. 「准确性」定义

- **实现正确**：`feColorMatrix` 反相与 `feHueRotate(180)` 与 RFC 013 的 CSS 链语义一致；`buildFilterPlusCss(themeFilters?, pagePalette?)` 通过 **`resolveFilterCssInjectionScope`** 与 **`buildFilterInvertMediaSelectorList`** 与 RFC 013 共用同一套挂载点与媒体补偿目标（`svg` 带 `:not(#change-dark-filter-plus-svg)`），其余含 `object` / `embed` / `iframe` / `[role="img"]` 等（2026-04-19 起）。
- **观感差异**：相对 Filter CSS，Chromium 上 SVG filter 对某些渐变、混合模式或硬件合成路径可能更稳或略有不同——仍属**反相族**，不保证与 Dynamic 一致。

与 **页面调色板**：与 RFC 027 §2.1 一致；降级到 RFC 013 时须传入同一 `pagePalette`（已实现）。

与 **原生已暗**：与 Filter CSS 相同：`auto` 下不注入；`on` 下亦不注入 Filter+（含降级 013）；`on` 下 Dynamic/Static 不受此限（RFC 025）。

---

## 3. 与 Filter（RFC 013）的差异清单（维护用）

| 项 | 说明 |
|----|------|
| 内联 SVG | Filter+ 对页面内联 `svg` 单独挂 `url(#...)`；Filter CSS 走统一选择器，边界行为以单测与手工为准 |
| 可用性 | 非 Firefox 暴露；失败降级 RFC 013 |
| 性能画像 | 与 Filter 同级警告（RFC 014 Risks）；不本文档重复量化 |

---

## 4. 精炼目标

1. **降级可观测性**：可选 `console` 诊断开关（仅 debug build）记录 `ensureFilterPlusSvg` 失败原因，便于区分「无 body」与「NS 异常」。
2. **E2E**：在 RFC 026 框架下增加「Filter+ 注入成功 / 强制降级」两条用例（Chromium-only）。
3. **文档**：**已实现（2026-05-17）** Popup `themeModeFilterPlusTitle`（与 RFC 027 同期）；帮助页站点文案仍待排期。

---

## 5. Non-goals

- 不在 Firefox 上启用 Filter+ 直至有独立兼容性 RFC。
- 不追求与 CSS Filter 像素级一致。

---

## 6. 风险

| 风险 | 缓解 |
|------|------|
| `url(#id)` 与 SPA 路由/克隆文档冲突 | 保持宿主 SVG 固定 id 与移除逻辑 `removeFilterPlusSvg` 成对测试 |

---

## 7. Decision log

- 2026-04-19：新建 Draft，作为 RFC 014 的精炼层。
- 2026-04-19：**已实现** 与 RFC 013 对齐的媒体补偿列表（`filter-plus-svg.ts` → `buildFilterInvertMediaSelectorList`）；RFC 014 实现表已更新。
- 2026-04-19：随 RFC 013 增补 **`audio`** 媒体补偿。
- 2026-04-19：`buildFilterPlusCss` 第二参数 `pagePalette` 与 RFC 013 Solarized/`dark` 分支对齐；单测 `filter-plus-svg.test.ts`。
- 2026-04-19：原生暗页 Filter+ 规则与 RFC 013/025 一致（`auto` 全跳过；`on` 不注入 Filter+）。
- 2026-05-17：Popup `themeModeFilterPlusTitle` 与 RFC 027 文案对齐。
