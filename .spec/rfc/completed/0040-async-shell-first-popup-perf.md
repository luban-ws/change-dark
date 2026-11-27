# RFC 0040: Popup 异步壳首帧加载进度与启动性能优化

**Status:** Implemented

## Summary

重构扩展 Popup 启动链路为「零阻塞内联暗色壳 + 进度指示器 + 异步 UI 块」架构，消除首屏 `i18next` 与串行 `chrome.storage` IPC 阻塞，引入单次批量存储快照 API 与 `localStorage` 温缓存，并在构建期裁剪 `@radix-ui/themes/styles.css` 中未使用的响应式断点、浅色主题、未用色板与组件样式，大幅缩短点击扩展图标到弹出可见界面的延迟。

## Problem

1. Chromium 扩展弹窗在 `index.html` 的静态 `<link rel="stylesheet">` 与 `<script type="module">` 完成加载并触发 `window.onload` 前保持窗口空白等待，而此前 Popup 在首屏同步静态引入 696 KB `@radix-ui/themes` CSS 与 459 KB JS。
2. `main.tsx` 在 `ReactDOM.createRoot().render()` 之前阻塞等待 `initPopupLanguageFromStorage()`（包含 `i18next.init`、`chrome.storage.local.get` 及首次写入 `chrome.storage.local.set`）。
3. `usePopupState` 在挂载后才触发 `chrome.tabs.query`，随后串行发起 8–10 次 `chrome.storage.local.get` IPC（且在切换 `editScope` 时重复查询）。
4. `App.tsx` 外层 `key={`popup-root-${lng}`}` 会在语言更新时销毁并重建整棵 Radix DOM 树；且旧实现未提供加载骨架与进度反馈。

## Goals

1. 点击图标后立即由 `index.html` 内联暗色壳（380×600）与纯 CSS 旋转指示器 + 分阶段进度文案完成 `window.onload` 与首帧绘制，不再出现长时间无反馈白屏/卡死感。
2. 将 React、Radix UI、i18n 与完整样式移入异步 chunk `mount-app.tsx`，在首帧可见后再加载挂载，并在主界面同步期间在标题旁展示紧凑同步指示器。
3. 在 `@change-dark/extension-settings` 提供单次批量读取 `POPUP_STORAGE_KEYS` 的 `readPopupStorageSnapshot()` / `parsePopupStorageSnapshot()`，与 `chrome.tabs.query` 在首屏并行预取，使 Popup 打开仅产生 1 次 `storage.local.get` IPC。
4. 构建期安全裁剪 `@radix-ui/themes/styles.css`（保留 `.dark`、`slate`、`cyan`、`red` 及实际用到的组件），并移除 Popup 对 `i18next`/`react-i18next` 的运行时依赖。

## Non-goals

1. 不改变 Popup 视觉布局、控件结构、快捷键与中英文案内容。
2. 不更改落地页 `apps/site` 的 i18n 实现。

## Design

1. `packages/extension-settings/src/storage.ts`：新增 `POPUP_STORAGE_KEYS`、`PopupStorageSnapshotV1`、`parsePopupStorageSnapshot`、`readPopupStorageSnapshot` 与 `hasSiteScopedDataInSnapshot`。
2. `apps/chrome/src/popup/index.html`、`main.tsx`、`popup-prefetch.ts`、`mount-app.tsx`：分离极轻量引导壳（内联关键样式与动画 spinner/进度条，零外部 CSS 阻塞）与动态 `import('./mount-app')`；`popup-prefetch.ts` 仅用键字面量预取，避免 `storage-*.js` 被首屏静态预加载。
3. `apps/chrome/src/popup/i18n.ts`、`hooks/usePopupState.ts`、`App.tsx`、`popup.css`：以轻量同步响应式语言 store 替代 `i18next`/`react-i18next`（保留可配置 `language` 数据属性兼容单测），加入 `localStorage` 温缓存、单次快照同步、`isSyncing` 指示器，并移除 `key={`popup-root-${lng}`}`。
4. `apps/chrome/scripts/prune-radix-css.ts` & `apps/chrome/vite.config.ts`：通过均衡花括号 CSS 裁剪器在 Vite `transform` 阶段移除 `>= 520px` 断点、`.light`/`.light-theme`、未用色标与未用 `.rt-*` 组件规则，并补充单测 `apps/chrome/src/__tests__/prune-radix-css.test.ts`。

## Acceptance

1. `apps/chrome/dist/src/popup/index.html` 不包含外部 `<link rel="stylesheet">` 或 `storage` `modulepreload`，入口脚本 <= 10 KB；`@radix-ui/themes` 产出 CSS 体积相比 679 KB 缩减 >= 60%。
2. 弹窗加载过程中可见 `#cd-boot-shell` 进度动画，进入主界面后仅发起 1 次 `chrome.storage.local.get`，且 Chromium `window.onload` 与首帧绘制耗时显著下降。
3. `extension-settings`、`chrome` 单元测试（含 `prune-radix-css.test.ts` 与全部 Popup 标签/集成单测）、`tsc --noEmit` 与 Playwright E2E 全部通过。
