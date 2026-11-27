# RFC 0041: Popup 异步入口脚本优化、骨架屏进度反馈与性能回归测试

**Status:** Implemented

## Summary

将扩展 Popup 入口脚本由阻塞 `DOMContentLoaded` 的 `<script type="module">` 改为非阻塞的 `<script type="module" async>`，升级内联 `#cd-boot-shell` 为带顶部同步指示器、进度条与暗色卡片骨架的即时引导壳，并新增自动化 Playwright 性能回归测试 `e2e/popup-perf.spec.ts` 守卫静态产物体积与运行时 DCL / FCP / 单次存储 IPC 预算。

## Problem

1. 经 Chromium A/B 实测，即使把 React/Radix/CSS 拆入异步 chunk，`index.html` 中 Vite 默认输出的 `<script type="module" crossorigin src="/assets/index.html-*.js">` 仍具有 `defer` 语义，会阻塞 `DOMContentLoaded` 与 `window.onload`（918–2056ms），使 Chromium 扩展弹窗在脚本下载解析前保持不可见。
2. 现有测试套件缺少针对 Popup 静态产物体积、无阻塞 CSS/preload、单次 `chrome.storage.local.get` IPC 与热启动 DCL/load 时延的自动化性能回归守卫。

## Goals

1. 构建阶段自动为 Popup HTML 的 `<script type="module" ...>` 注入 `async` 属性，让 HTML 解析与内联暗色壳绘制不被模块脚本阻塞（热启动 `DCL` 降至 `< 500ms`）。
2. 强化 `#cd-boot-shell` 骨架屏（顶部栏同步旋转徽标 + 主体加载 spinner + 动画进度条 + 分阶段文案 + 卡片骨架占位），确保弹窗一打开即有明确加载反馈。
3. 新增 `apps/chrome/e2e/popup-perf.spec.ts`，在每次 E2E 运行中自动校验静态预算（无外部阻塞 stylesheet、无 `storage` `modulepreload`、入口 script `async` 且 `<= 10 KB`、裁剪后 CSS `<= 220 KB`）与运行时指标（零报错、即时可见、单次 `storage.local.get`、热启动 DCL `< 500ms` 与 load `< 1500ms`）。

## Non-goals

1. 不改变 Popup 业务逻辑或设置存储 schema。
2. 不将性能阈值绑定到不稳定外部网络站点（完全基于本地扩展打包产物实测）。

## Design

1. `apps/chrome/vite.config.ts`：新增 `asyncPopupEntryScriptPlugin()`（`enforce: 'post'` + `transformIndexHtml`），将 Popup HTML 中的 `<script type="module"` 改写为 `<script type="module" async`。
2. `apps/chrome/src/popup/index.html`：升级 `#cd-boot-shell` 骨架占位与旋转进度指示器，保持零外部 `<link>` 且内联总大小 `< 4 KB`。
3. `apps/chrome/src/popup/main.tsx`：移除多余的 `setTimeout(..., 0)` 跳转，在 `complete` / `load` 后立即通过 `requestAnimationFrame` 启动 `import('./mount-app')`。
4. `apps/chrome/e2e/popup-perf.spec.ts`：新增静态产物体积/结构校验与 Chromium 3 次冷/热启动实时指标门禁测试。

## Acceptance

1. `apps/chrome/dist/src/popup/index.html` 包含 `<script type="module" async` 且无 `<link rel="stylesheet">`。
2. `HEADLESS=true pnpm --filter @change-dark/chrome exec playwright test e2e/popup-perf.spec.ts e2e/smoke.spec.ts --reporter=list` 全部通过并输出 `[POPUP-PERF]` 指标。
3. `specify validate` 与 `specify sync-check` 通过。
