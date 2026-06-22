# RFC 025 — 全局策略（Auto/On/Off）× 主题模式行为矩阵

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | T-037 |
| 创建日期 | 2026-04-06 |

依赖：[RFC 008](./008-global-on-off-policy.md)（全局策略）、[RFC 012](./012-theme-mode-dynamic.md)（Dynamic）、[RFC 013](./013-theme-mode-filter-css-invert.md)（Filter）、[RFC 014](./014-theme-mode-filter-plus-svg.md)（Filter+）、[RFC 015](./015-theme-mode-static.md)（Static）、RFC 024（Auto 智能检测）

---

## Summary

本 RFC 是**行为约定参考**，明确以下三件事：

1. **全局策略**（Auto / On / Off）与**主题模式**（Filter / Filter+ / Dynamic / Static）的完整排列组合下，扩展对每个页面做什么。
2. **原生深色检测**（`native-dark-surface` + 阈值 `readAutoDarkThreshold`）与 **全局策略** 的组合：**`auto`+原生暗** 不注入任何模式；**`on`+原生暗** 仅注入 Dynamic/Static，**禁止** Filter/Filter+（反相会把暗页变亮）。
3. **何时需要刷新页面**（硬刷新 Tab）才能看到最新效果。
4. **页面调色板**（`dark` / `solarized-dark`）与主题模式正交：凡注入依赖底/字色的路径须使用 `readEffectivePagePaletteForPage()`，见 [RFC 023](./023-dynamic-color-engine-pipeline.md) 与 [RFC 027](../rejected/027-theme-mode-filter-css-refinement.md) §2.1。

---

## 1. 全局策略语义

| 策略 | 含义 |
|------|------|
| **Auto** | **浅色页**：按所选主题模式注入。**原生暗页**：**不注入**任何强制暗色（尊重当前页）。 |
| **On** | **浅色页**：始终按所选主题模式注入。**原生暗页**：**强制注入** Dynamic / Static（非反相路径）；**不注入** Filter / Filter+（反相族禁止）。 |
| **Off** | 从不注入，无论页面颜色 |

---

## 2. 行为矩阵

> ✅ = 正常注入强制暗色样式  ⏭ = 跳过（原生暗页或策略 Off）  ❌ = 不注入（Off）

| 主题模式 | Auto（浅色页） | Auto（原生暗页） | On（浅色页） | On（原生暗页） | Off |
|---------|---------------|-----------------|-------------|---------------|-----|
| **Filter（CSS 反相）** | ✅ | ⏭ | ✅ | ⏭ | ❌ |
| **Filter+（SVG filter）** | ✅ | ⏭ | ✅ | ⏭ | ❌ |
| **Dynamic（WASM 采色）** | ✅ | ⏭ | ✅ | ✅ | ❌ |
| **Static（固定样式）** | ✅ | ⏭ | ✅ | ✅ | ❌ |

**原生暗判定**：`measureNativelyDarkSnapshot`（内容脚本）→ `isNativelyDarkFromHtmlBodyBackgrounds`（`packages/extension-settings/src/native-dark-surface.ts`），阈值来自存储而非硬编码 80。

**页面调色板**：与上表正交；`dark` 与 `solarized-dark` 在 **凡写入底/字色或 Filter 壳层** 的路径上必须一致（`readEffectivePagePaletteForPage()` → `buildFilterInvertCss` / `buildFilterPlusCss` / `colorsForPalette` 等）。

---

## 3. 原生暗检测与 `runPaint` 顺序（实现）

```
applyForcedDark()
  └─ readShouldApplyForcedDarkForPage()  ← Off → 返回 false，清理并退出
  └─ readGlobalPolicy()                  ← 'auto' | 'on' | 'off'
  └─ readEffectivePagePaletteForPage()   ← dark | solarized-dark（凡上色路径须传入）
  └─ runPaint()
       └─ measureNativelyDarkSnapshot(threshold)
       └─ if policy === auto AND nativelyDark → clearForcedDarkSurface(); return
       └─ skipInvertOnNativeDark = nativelyDark AND policy === on
       └─ Filter+ / Filter CSS：若 skipInvertOnNativeDark → clear;return
       └─ Static / Dynamic：照常（on+原生暗仍注入）
```

**为什么不用 k-means baseRgb 做检测**：许多原生深色 SPA（如 GitHub）的元素 `background-color` 为 `transparent`，k-means 采样不足时回退到 `STATIC_FALLBACK_RGB = [248, 250, 252]`（亮白），导致误判为浅色页面。直接读 `html`/`body` 的 computed background-color 更可靠。

**为什么临时移除 ROOT_ATTR**：如果上一次注入已经将 `html[ROOT_ATTR] body { background: Solarized !important }` 写入，直接读 `body` 的 computed style 会得到 Solarized 颜色（亮度 ~16），导致任何已注入页面都被判定为“原生深色”。移除属性后，`!important` 规则失效，读到的是页面自身的颜色。

---

## 4. 何时需要刷新页面

Chrome 扩展的 **content script** 只在页面**加载时**注入一次。

| 操作 | 是否需要刷新 Tab | 说明 |
|------|-----------------|------|
| 在 popup 中修改设置（策略/模式/配色/滤镜） | **❌ 不需要** | `chrome.storage.onChanged` 触发，content script 重新调用 `applyForcedDark()` |
| 在 `chrome://extensions` 中重新加载扩展 | **✅ 需要** | 旧 content script 仍在已打开的 Tab 中运行，不会自动替换为新版本 |
| 安装扩展更新（`.zip` 包更新） | **✅ 需要** | 同上 |
| 打开新 Tab / 新页面 | **❌ 不需要** | 新页面会直接注入最新版 content script |

**结论**：日常使用中（改设置）无需刷新页面。只有**更新扩展代码本身**后，需要在 `chrome://extensions` 点击刷新，并**手动刷新**已打开的 Tab。

---

## 5. Non-goals

- 扩展更新后自动刷新已打开 Tab（MV3 无对应 API，且侵入性强）

---

## Decision log

- 2026-04-06：新建 RFC 025（T-037），记录行为矩阵与检测实现细节。Auto 检测从 Dynamic 专用升级为所有模式共用。检测方式从 k-means 切换为直接读 `html`/`body` computed background-color。
- 2026-04-06：完成 Auto 模式深色检测阈值配置化（T-038），在 Popup 增加智能暗色阈值滑块（0-255），默认 80。
- 2026-04-19：行为矩阵扩展 **On（原生暗）** 列：Filter / Filter+ 为 ⏭；亮度判定提取为 `native-dark-surface.ts`。
- 2026-04-19：**On** 语义：浅色页全模式注入；**原生暗页**仅 Dynamic/Static 注入，Filter/Filter+ 不注入（反相禁止）。**Auto** 在原生暗页全 ⏭。
