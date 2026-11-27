# RFC 0038: Theme DSL（.theme）与 Rust winnow 编译器及异步批改色

**Status:** Implemented

## Summary

定义官方 `.theme` 领域特定语言（Theme DSL）及其单一真源 Rust `winnow = "0.7"` 解析与格式化引擎 `packages/theme-dsl`，同时驱动多线程并行的 `theme-dsl-check` `.theme` 校验 CLI 与 `@change-dark/dark-engine` WASM 运行时直接编译/校验/格式化接口；`@change-dark/site-catalog` 零中间 JSON、直接加载并执行 `.theme` 源码，并在 `@change-dark/dynamic-recolor` 中增加可协作让出主线程的 `batchModifyColorsAsync` 异步分块批改色管线。

## Problem

1. 站点档案（`SiteProfileV1`）以手写 JSON 维护，缺乏注释、多行 `customCss` 书写体验差，且无语法与语义静态校验。
2. 构建期校验与运行期站点目录 / 用户补丁（`SiteProfilePatchV1`）需要直接执行 `.theme` DSL 并共享完全一致的语法、错误行列诊断与往返格式化，避免生成中间 JSON 文件或维护 JS/Rust 双份解析器。
3. `@change-dark/dynamic-recolor` 的批量改色目前仅提供同步 `batchModifyColors`，遇到大量离散色值样本时可能长时间占用主线程阻塞 UI 响应。

## Goals

1. 确立 `.theme` 文本 DSL 官方语法：`//` 与 `#` 注释、`"..."` 单行字符串与 `"""..."""` 多行字符串、允许尾逗号的字符串列表，以及顶层 `profile "<id>" { ... }` 与 `patch { ... }` 块。
2. 新建独立 Rust crate `packages/theme-dsl`（`theme_dsl` lib + `theme-dsl-check` bin，基于 `winnow = "0.7"` + `serde`/`serde_json`），IR 与 `@change-dark/site-catalog` 的 `SiteProfileV1` / `SiteProfilePatchV1` 1:1 对齐，并提供带 1-based `line`/`column`/`offset` 的诊断错误及无损格式化 `format_theme_patch` / `format_theme_profile`。
3. `theme-dsl-check` 使用 `std::thread::scope` 多线程并行校验目录下全部 `*.theme` 文件的语法、语义与跨文件 `id` 唯一性，零 JSON 文件输出。
4. 将 `theme_dsl` 接入 `@change-dark/dark-engine` WASM（`compileThemeDsl`、`compileThemePatchDsl`、`compileThemePatchDslAsync`、`formatThemePatchDsl`）。
5. 将 `@change-dark/site-catalog` 从 `google-marketing-platform.json` 迁移为 `google-marketing-platform.theme`（经 Vite `?raw` 内联源码、零中间 JSON），运行期直接调用 Rust `winnow` WASM 执行 `.theme`（并支持 `resolveSitePolicy` 直接传入 `userPatchDsl` `.theme` 源码）。
6. 在 `@change-dark/dynamic-recolor` 新增 `batchModifyColorsAsync`，小批量走单次同步 WASM 快路径，大批量按分块协作让出主线程（`scheduler.yield()` 回退 `setTimeout(0)`）。

## Non-goals

1. 本 RFC 不修改扩展弹窗（Popup）或设置页 UI（留待 RFC 0039 处理）。
2. 不引入外部异步运行时或 Web Worker（仅使用标准库线程与浏览器协作调度 / microtask 让出）。

## Design

### 1. `.theme` 语法与语义模型

顶层支持 `profile "<id>" { ... }`（对应 `SiteProfileV1`，固定 `v: 1`）或独立 `patch { ... }`（对应 `SiteProfilePatchV1`）：
* 注释：`// ...` 与 `# ...`（行内及块内空白处均可出现，多行 `"""..."""` 内部按字面保留）。
* `profile "<id>" { ... }` 子块与字段：
  * `priority <u32>`（可选）
  * `match { hostEquals [...]; hostSuffix [...]; pathPrefix [...] }`（至少提供一项匹配规则）
  * `surfaceRepair { landmarkSelectors [...]; componentClassHints [...]; neverPaint [...]; minPanelAreaPx <u32>; minPanelWidthPx <u32>; minPanelHeightPx <u32>; gutterProbe { mainSelector "..."; insetPx <u32> } }`
  * `recolor { forceShorthandProperties [...]; cssVarSubstitute { "--name" { use bg|fg|border; fallback "..." } } }`
  * `customCss "..."` 或 `customCss """..."""`
* `patch { ... }` 子块与字段：可选 `disabled <bool>`、`surfaceRepair { ... }`、`recolor { ... }`、`customCss ...`。
* 属性间可用换行或分号分隔，字符串列表 `[ ... ]` 允许尾逗号。

### 2. Rust crate `packages/theme-dsl`

* `src/ast.rs`：定义与 `SiteProfileV1` / `SiteProfilePatchV1` 完全对应的 Rust 结构体与 `DslError { message, line, column, offset }`。
* `src/parser.rs`：使用 `winnow = "0.7"` 组合子解析词法、字符串（含 `\"` `\\` `\n` `\r` `\t` 转义及 `"""..."""` 首行紧跟换行裁剪）、语义约束检查及基于原始字节偏移计算的 1-based 行列号。
* `src/format.rs`：`format_theme_profile` 与 `format_theme_patch`，保证格式规范且可往返无损解析。
* `src/bin/check_themes.rs`：接收输入目录，扫描 `*.theme` 并在 `std::thread::scope` 中并行解析，校验跨文件重复 `id` 后直接报告通过文件与档案计数（零 JSON 输出）。

### 3. `@change-dark/dark-engine` WASM 绑定与 `@change-dark/dynamic-recolor` 异步批改色

* `packages/dark-engine/Cargo.toml` 增加 `serde_json = "1"` 与 `theme_dsl = { path = "../theme-dsl" }`。
* `packages/dark-engine/src/lib.rs` 导出 `compileThemeDslWasm`、`compileThemePatchDslWasm`、`formatThemePatchDslWasm`，返回结果包络 `{ ok: true, data } | { ok: false, error }`；`packages/dark-engine/src/theme-dsl.ts` 封装类型化 API 与 `Promise.resolve().then(...)` 微任务隔离的 `compileThemePatchDslAsync`。
* `packages/dynamic-recolor/src/modify-colors.ts` 新增 `AsyncBatchColorOptions { chunkSize?: number; signal?: AbortSignal }` 与 `batchModifyColorsAsync(items, profile, options)`：`items.length <= chunkSize`（默认 `512`）直接同步调用 `batchModifyColors`；超出时按块调用并在块间通过 `globalThis.scheduler?.yield?.()` 或 `setTimeout(..., 0)` 让出主线程且支持 `AbortSignal`。

### 4. `@change-dark/site-catalog` 零 JSON 运行时直接执行 `.theme`

* 新增 `packages/site-catalog/src/catalog/google-marketing-platform.theme`（与原档案语义 100% 等价）并删除 `google-marketing-platform.json`。
* `packages/site-catalog/src/resolve.ts` 通过 `import.meta.glob('./catalog/*.theme', { query: '?raw', import: 'default', eager: true })` 直接加载 `.theme` 原文，由 `loadSiteCatalogFromThemes` 调用 `compileThemeDsl`（Rust `winnow` WASM）在运行期直接解析与校重；同时 `resolveSitePolicy` 支持直接传入 `userPatchDsl?: string` 经 `compileThemePatchDsl` 执行。
* `packages/site-catalog/package.json` 增加 `check:themes` 脚本调用 `theme-dsl-check ./src/catalog`。

## Delivery

D1. 新建 `packages/theme-dsl` crate（`ast.rs`、`parser.rs`、`format.rs`、`lib.rs`、`bin/check_themes.rs`）并通过 `cargo test`。

D2. 在 `packages/dark-engine` 暴露 `.theme` 执行/格式化 WASM 及 TS 封装；在 `packages/dynamic-recolor` 实现 `batchModifyColorsAsync`。

D3. 将 `packages/site-catalog` 迁移至零中间 JSON 的运行期直接 `.theme` WASM 执行并移除旧手写 JSON。

D4. 补全 Rust 单测、`site-catalog` 直接 `.theme` 执行与 `userPatchDsl` 单测、WASM `.theme` 单测及 `batchModifyColorsAsync` 分块让出单测，全量构建、测试、Lint 通过并归档本 RFC。

## Acceptance

1. `cargo test --manifest-path packages/theme-dsl/Cargo.toml` 与 `cargo test --manifest-path packages/dark-color-utils/Cargo.toml` 全部通过，且 `pnpm --filter @change-dark/site-catalog run check:themes` 通过（仓库无 `generated-catalog.json` 中间产物）。
2. `pnpm --filter @change-dark/dark-engine build`、`site-catalog build`、`dynamic-recolor build`、`chrome build` 构建通过。
3. `@change-dark/site-catalog`、`@change-dark/dynamic-recolor`、`@change-dark/chrome` Vitest 与 `pnpm run lint` 全量通过。
4. `specify.mjs sync-check` 通过且本 RFC 归档至 `.spec/rfc/completed/`。
