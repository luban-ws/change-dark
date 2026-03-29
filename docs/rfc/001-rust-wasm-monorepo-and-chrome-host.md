# RFC 001 — Rust/WASM 核心与 Chrome 宿主（pnpm + Turbo monorepo）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 创建日期 | 2026-03-29 |
| 作者 | Maintainers |
Supersedes: —  
Superseded-By: —

## Summary

将「嫦娥 / Change Dark」Chrome 扩展的重计算放在 **Rust → WASM** 中完成，宿主扩展由 **Vite + @crxjs/vite-plugin** 构建；仓库采用 **pnpm workspace + Turbo**，共享算法放在独立 crate `dark_color_utils`，WASM 边界 crate 为 `dark_engine`。

## Context / Problem

- 站点无原生暗色模式时，需要在内容脚本中做颜色与样式决策；纯 JS 在大量 DOM/颜色运算时易占用主线程。
- 需要可在 **非浏览器环境测试** 的纯逻辑，并与浏览器侧 WASM **同构复用**。

## Goals

1. monorepo 中可共享 Rust crate；`wasm-pack`（`bundler` 目标）产出中间体 `pkg/`，再经 Vite 将 WASM **打进** 对外唯一的 `dist/`。
2. Chrome MV3 扩展：`apps/chrome` 构建产物可「加载已解压」安装；内容脚本可调用 WASM 导出函数。
3. `pnpm run build` / `test` / `lint` 在 CI 上可重复执行。

## Non-goals

- 不在本 RFC 中规定最终暗色算法（反色、滤波、变量覆写等）的终极形态，仅锁定 **架构与边界**。
- 不规定应用商店上架资产（图标、隐私文案等）。

## Proposal

### 仓库布局

| 路径 | 职责 |
|------|------|
| `packages/dark-color-utils` | 纯 Rust 颜色与对比度相关函数；`cargo test`。 |
| `packages/dark-engine` | `cdylib` + `rlib`；`wasm-pack` → `pkg/`（中间体）→ **Vite** → **`dist/`**（唯一发布面）。 |
| `apps/chrome` | MV3 manifest、background、content script；依赖 `workspace:*` 的 `@luban-ws/dark-engine`。 |

### 构建与工具链

- **Turbo**：`@luban-ws/chrome` 的 `build` 依赖上游 `@luban-ws/dark-engine` 的 `build`（`^build`）；各包 JS 产出由 **Vite** 打包。
- **WASM 与引擎包**：`dark-engine` 先 `wasm-pack` → **gitignored 的 `pkg/`**（仅中间体），再以 **Vite library** 打成唯一发布目录 **`dist/`**（WASM 内联进 `index.mjs`；`index.d.ts` 与 `index.cjs` 由构建后脚本写入 `dist/`）；若 PATH 中 Homebrew `rustc` 优先于 rustup，构建脚本需将 `$HOME/.cargo/bin` 置于 PATH 前。
- **Vite**：扩展与各 `packages/*` 的 JS 均经 Vite；`wasm-bindgen` 使用 `vite-plugin-wasm` 与 `vite-plugin-top-level-await`（扩展与 `dark-engine` 打包）。

### 运行时边界

- 内容脚本只依赖 `@luban-ws/dark-engine` 的 **`dist/`**（`package.json` 的 `exports` 不暴露 `pkg/`）；当前 `wasm-bindgen` bundler 链在模块加载路径完成初始化，**不依赖**旧的 `default` `init()` 导出（若升级 bindgen 后变化，应更新本文与内容脚本）。
- 启用/关闭扩展行为使用 `chrome.storage.local`（键名以 shared `constants` 为单一来源）。

### 数据流（高层）

```
Content script (TS) ──import──▶ dark_engine.js / .wasm
                                      │
                                      ▼
                              dark_color_utils (Rust)
```

## Alternatives considered

1. **单 crate + cfg(wasm32)**：减少 Cargo 元数据，但测试与 CLI/批处理复用边界变模糊；否决。
2. **纯 TS 无 WASM**：交付快，但与「重计算外移」目标不符；作为未来低端设备回退可在后续 RFC 讨论。

## Risks

| 风险 | 缓解 |
|------|------|
| `wasm-bindgen`  major 升级改变 JS 形状 | 锁定依赖版本并设回归构建；更新 RFC「运行时边界」节 |
| 开发者环境仅有 Homebrew Rust、缺 `wasm32` | 仓库根 `rust-toolchain.toml` + 本地构建脚本前置 `$HOME/.cargo/bin`；CI 见 `.github/workflows/ci.yml` |
| 内容脚本与跨域安全 / CSP | 仅用扩展打包资源加载 WASM；新 injection 模式需安全评审 |

## Testing strategy

- Rust：`packages/dark-color-utils` 单元测试；`dark-engine` 保留 `rlib` 便于宿主侧 `cargo test`。
- TS：`apps/chrome` 对无浏览器依赖的纯函数使用 Vitest（例：CSS 拼装）。
- 构建：`pnpm run build` 生成含 `.wasm` 的 `apps/chrome/dist`。

## Work breakdown（与 TASK_TRACKING 对齐）

| ID | 任务 | 状态 |
|----|------|------|
| T-001 | 维护 RFC 001 与 ROADMAP / TASK_TRACKING 一致 | Done |
| T-002 | CI：`rust-toolchain.toml` + `wasm32` + Turbo / cargo 缓存 | Done |
| T-003 | 后续能力：**一事一 RFC**，见 [RFC 目录](./README.md) **004–019** | Done |

## Decision log

- 2026-03-29：初稿，对应已实现 monorepo + WASM + MV3 骨架。
- 2026-03-29：**Approved**；T-001～T-003 收口，CI 工作流落地；功能规格见 **[RFC 目录](./README.md)** 中单篇 RFC。
