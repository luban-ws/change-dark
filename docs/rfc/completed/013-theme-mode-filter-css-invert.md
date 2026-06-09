# RFC 013 — 主题模式：Filter（CSS 反相）（T-025）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-025** |
| 参考 | [Dark Reader Help — Filter mode issues](https://darkreader.org/help/en/) |

依赖：[011](./011-theme-filter-sliders.md)

## Summary

实现 **整页 CSS filter 反相** 路径，并对若干 **像素型 replaced 内容** 做 **再反相** 还原（列表见下表「媒体」行）；Help 提示的亚像素、性能问题须在 UI 标注与默认模式选择中体现。

## Goals

1. 适用「问题站点」回退或用户显式选择。
2. 与 [RFC 011](./011-theme-filter-sliders.md) 链式组合 filter 不冲突。
3. iframe / shadow DOM 边界行为文档化（最小可行）。

## Non-goals

- 不解决所有浏览器 filter bug（记录 Known issues）。

## Risks

| 风险 | 缓解 |
|------|------|
| 大页面卡顿 | 默认非 Filter；警告文案 |
| 已暗站点变亮 | 提示切换 Dynamic/Static |

## Testing

- 手工：视频、图片、canvas 页。

## Implementation（落地）

| 项 | 说明 |
|----|------|
| 存储 | `change-dark:theme-mode` = `filter-css`（与 `dynamic` / `static` 互斥，见 RFC 012） |
| 页面调色板 | 与 Static/Dynamic 同源：`readEffectivePagePaletteForPage()` → `buildFilterInvertCss(themeFilters, pagePalette)`（`apps/chrome/src/content/index.ts`）。**`solarized-dark`**：`html[data-change-dark-root]` 仅铺 base03/base1 壳色，`filter`（反相链 + RFC 011）挂在 **`body`**，避免壳色与整页反相叠在同一节点被冲掉；媒体补偿前缀与 `resolveFilterCssInjectionScope` 一致（`html[…] body img` 等）。**`dark`（默认）**：反相仍挂在 `html[…]`，与历史行为一致，不在本路径做 WASM 采样。 |
| 根 `filter` | `FILTER_CSS_INVERT_CHAIN`（`invert(1) hue-rotate(180deg)`）+ 可选 RFC 011 链（接在反相链之后）；Solarized 时作用在 `body` 选择器上。 |
| 媒体 | `buildFilterInvertMediaSelectorList`：`img` / `picture` / `svg` / `video` / `audio` / `canvas` / `object` / `embed` / `iframe` / `[role="img"]` 使用同链再反相，抵消整页反相对 replaced 内容的大致观感（2026-04-19 起与 RFC 027 对齐） |
| 边界 | **`iframe` 元素**：父文档中对 iframe **框** 做媒体补偿；**跨域子文档**内仍须各自内容脚本注入。**shadow DOM**：继承宿主文档注入，封闭 shadow 内样式不由此表覆盖（最小可行） |
| Popup | 第三项「Filter（CSS 反相）」+ 性能/已暗站点/滤镜顺序/iframe 提示 |
| 实现 | `buildFilterInvertCss` + `resolveFilterCssInjectionScope` + `buildFilterInvertMediaSelectorList`（`packages/shared/src/css.ts`）；内容脚本 `THEME_MODE_FILTER_CSS` 分支无 WASM |
| 原生已暗 | **不注入**本模式：`POLICY_AUTO` 时与全模式一同提前退出；`POLICY_ON` 时仍禁止 Filter（反相），Dynamic/Static 可注入（RFC 025）。 |

## Known issues

- 大页面整页 `filter` 可能卡顿（RFC Risks）；默认仍为 Dynamic。
- ~~已为暗色的站点在反相后可能变亮~~：**缓解（2026-04-19）** `POLICY_AUTO` 或 `POLICY_ON` 且原生暗时**不注入** Filter / Filter+（`on` 下 Dynamic/Static 仍可按 RFC 025 注入）；误判边界（极浅伪装暗色等）仍可能存在。
- 与 RFC 011 非中性组合时，媒体再反相仅抵消基链，观感可能略有偏差。

## Decision log

- 2026-03-29：独立 RFC。
- 2026-03-29：实现 Approved。
- 2026-04-19：媒体补偿选择器扩展（`object` / `embed` / `iframe` / `audio` / `[role="img"]` 等），与 Filter+ 共用 `buildFilterInvertMediaSelectorList`；见 [RFC 027](../027-theme-mode-filter-css-refinement.md) Decision log。
- 2026-04-19：**页面调色板**：内容脚本将 `pagePalette` 传入 `buildFilterInvertCss`；`solarized-dark` 时 `html` 壳色 + `body` 反相 + 媒体前缀对齐（与 RFC 023「聚合后覆盖」在观感上对齐，仍无 WASM）。
- 2026-04-19：**原生已暗**：`auto` 全模式跳过；`on` 仅跳过反相族（`native-dark-surface.ts` + `applyForcedDark`）；RFC 025。
