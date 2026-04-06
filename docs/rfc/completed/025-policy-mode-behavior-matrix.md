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
2. **Auto 模式下原生深色检测**的判定方式与各主题模式的适用范围。
3. **何时需要刷新页面**（硬刷新 Tab）才能看到最新效果。

---

## 1. 全局策略语义

| 策略 | 含义 |
|------|------|
| **Auto** | 扩展智能决策：对原生深色页面不重复注入；对浅色页面正常注入 |
| **On** | 始终注入，完全忽略原生深色检测 |
| **Off** | 从不注入，无论页面颜色 |

---

## 2. 行为矩阵

> ✅ = 正常注入样式  ⏭ = 跳过（自动检测判定为原生深色）  ❌ = 不注入（Off 策略）

| 主题模式 | Auto（页面浅色） | Auto（页面原生深色） | On | Off |
|---------|-----------------|---------------------|----|-----|
| **Filter（CSS 反相）** | ✅ 整页反相 | ⏭ 检测 html/body 背景，跳过 | ✅ | ❌ |
| **Filter+（SVG filter）** | ✅ SVG 反相 | ⏭ 检测 html/body 背景，跳过 | ✅ | ❌ |
| **Dynamic（WASM 采色）** | ✅ WASM 采样注入 | ⏭ 检测 html/body 背景，跳过 | ✅ | ❌ |
| **Static（固定样式）** | ✅ 固定暗色 | ⏭ 检测 html/body 背景，跳过 | ✅ | ❌ |

**Auto 检测在所有模式下均生效**，在所有模式分支之前统一执行。

---

## 3. Auto 检测实现（所有模式共用）

```
applyForcedDark()
  └─ readShouldApplyForcedDarkForPage()  ← Off → 返回 false，清理并退出
  └─ readGlobalPolicy()                  ← 'auto' | 'on' | 'off'
  └─ runPaint()
       └─ [所有模式入口前，Auto 检测] ← On/Off 跳过此块
            remove ROOT_ATTR temporarily  ← 消除我们自己上次注入的 !important 影响
            getComputedStyle(html).backgroundColor
            getComputedStyle(body).backgroundColor
            luma = 0.2126*R + 0.7152*G + 0.0722*B
            if (htmlLuma < 80 OR bodyLuma < 80) → 跳过所有模式的注入
       └─ [模式分支] Filter / Filter+ / Static / Dynamic
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
