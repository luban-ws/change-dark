# RFC 0039: 修复内容脚本 WASM 初始化竞态、严格 CSP 拦截与暗色开关即时生效

**Status:** Implemented

## Summary

修复 `@change-dark/dark-engine` 的两大内容脚本初始化故障：其一，`vite-plugin-top-level-await` 预转译在下游 Vite 打包时丢失 `await` 语义，导致 `@change-dark/site-catalog` 顶层调用 `compileThemeDsl` 抛出 `TypeError: Cg is not a function`；其二，严格 CSP 页面（如 `https://www.npmjs.com/` 下发 `default-src 'none'; script-src 'nonce-...'` 且未授权 `'wasm-unsafe-eval'`）拦截 `WebAssembly.instantiate()` 导致内容脚本整页崩溃。同时令已完成加载页面上的 Popup On/Off 切换跳过空闲队列延迟即时生效。

## Problem

1. `packages/dark-engine/vite.config.ts` 启用了 `vite-plugin-top-level-await`，将 WASM 初始化转译为导出 `let __tla = (async () => { ... })()` 的普通模块。`apps/chrome` 打包时 Rollup 摇树移除未引用的 `__tla` 导出，内容脚本中仅剩未被 `await` 的异步 IIFE，而 `packages/site-catalog/src/resolve.ts` 顶层同步调用 `compileThemeDsl` 直接抛出 `TypeError` 并阻断 `applyForcedDark()` 与 `chrome.storage.onChanged.addListener`。
2. Chromium 对 MV3 内容脚本中的 `WebAssembly.instantiate()` 强制执行宿主页面的 `Content-Security-Policy`。在类似 `https://www.npmjs.com/` 的严格 CSP 站点，未捕获的 `WebAssembly.instantiate()` 异常同样使内容脚本启动即失败，暗色模式与开关完全无响应。
3. 在已完成加载的页面上通过 Popup 切换全局开关时，`applyForcedDark()` 仍走 `scheduleIdleTask(() => whenDocumentComplete())` 路径，造成响应延迟。

## Goals

1. 由 `packages/dark-engine/src/wasm-runtime.ts` 在模块顶层 `try/catch` 内通过原生 ES `top-level await` 实例化内联 WASM；当宿主页面 CSP 禁止 `WebAssembly.instantiate` 时捕获异常并通过 `js-fallback.ts` 无缝降级到纯 JS 色彩计算与解析，保证零未捕获异常。
2. `@change-dark/site-catalog` 改为懒加载并缓存 `getBundledSiteCatalog()`，同时为 `BUNDLED_SITE_CATALOG` 标注 `/* @__PURE__ */`，避免模块求值期同步触发 WASM 解析。
3. 当 `document.readyState === 'complete'` 时，`applyForcedDark()` 直接同步执行首屏快速暗色壳（重任务仍保留在 `scheduleIdleTask`），确保开关切换即时响应。

## Non-goals

1. 不改动 Rust `dark-engine` 或 `theme-dsl` 的色彩计算与语法解析算法。
2. 不变更扩展 manifest 权限或内容脚本注入时机（仍为 `document_start`）。

## Design

1. `packages/dark-engine/src/wasm-runtime.ts` & `js-fallback.ts` & `vite.config.ts`：移除 `vite-plugin-wasm` 与 `topLevelAwait()`，直接通过 Vite `?inline` 内联 `dark_engine_bg.wasm` 并在 `try { await WebAssembly.instantiate(...) } catch` 中初始化 `dark_engine_bg.js`；被 CSP 拦截时自动切到纯 JS 实现。
2. `packages/site-catalog/src/resolve.ts`：新增带缓存的 `getBundledSiteCatalog()` 供 `resolveSitePolicy` 调用，并将 `BUNDLED_SITE_CATALOG` 标记为 `/* @__PURE__ */`。
3. `apps/chrome/src/content/index.ts`：在 `applyForcedDark()` 中判断 `document.readyState === 'complete'` 时直接调用 `runPaint()`。
4. `apps/chrome/e2e/smoke.spec.ts`：新增本地静态页与严格 CSP 页（模拟 `npmjs.com` 无 `'wasm-unsafe-eval'` CSP）端到端回归测试，验证零 console/pageerror、首屏注入暗色以及通过 Popup 开关切换 Off/On 后即时生效。

## Acceptance

1. `packages/dark-engine/dist/index.mjs` 包含受 `try/catch` 保护的原生 `top-level await` 初始化，正常页面与 Vitest 仍走 Rust/WASM（`isWasmAvailable() === true`），严格 CSP 页面自动降级且零报错。
2. `@change-dark/dark-engine`、`@change-dark/site-catalog`、`@change-dark/dynamic-recolor`、`@change-dark/chrome` 单元测试与 `tsc --noEmit` 全部通过。
3. Playwright E2E（含 `smoke.spec.ts` 正常页 Off/On 切换及严格 CSP 站点暗色注入测试）全部通过。
