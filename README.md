# 嫦娥 · Selena

**English:** A **Chromium (Manifest V3)** extension that applies a **forced dark appearance** to websites. Heavy color math runs in **Rust → WebAssembly**; the host UI, content scripts, and bundling are **TypeScript** with **Vite** and [**CRXJS**](https://github.com/crxjs/chrome-extension-tools).

**中文：** 在网页上注入暗色样式与主题策略；配色聚合、亮度聚类等在 **WASM** 中完成，扩展侧为 MV3 + 存储策略，规格以 **`.spec/rfc/`** 为准（一事一 RFC）。**产品仅保留 Dynamic 模式**（RFC 032）。

---

### 🌐 **[Live Demo / 产品落地页](https://luban-ws.github.io/change-dark/)**

---

## 功能概览

| 能力 | 说明 |
|------|------|
| **Dynamic** | 视口采样 + stylesheet/inline 改色 + WASM `modifyColor`；见 [RFC 023](.spec/rfc/completed/023-dynamic-color-engine-pipeline.md)、[RFC 031](.spec/rfc/completed/031-dynamic-recolor-engine.md) |
| **全局策略** | Auto / On / Off，见 [RFC 008](.spec/rfc/completed/008-global-on-off-policy.md) |
| **按站覆盖** | Only for、站点列表与 pattern，见 [RFC 016](.spec/rfc/completed/016-only-for-per-site-overrides.md)、[RFC 017](.spec/rfc/completed/017-site-list-patterns-regex.md) |
| **页面配色 / 字体** | Solarized 等页面调色板、字体与描边，见 [RFC 022](.spec/rfc/completed/022-solarized-dark-popup-ui.md)、[RFC 018](.spec/rfc/completed/018-font-and-text-stroke.md) |
| **站点 catalog** | 跨站 surface repair / recolor profile，见 [RFC 034](.spec/rfc/034-site-profile-catalog.md) |

> Static、Filter、Filter+ 已于 [RFC 032](.spec/rfc/completed/032-theme-mode-product-consolidation.md) 从产品中移除（历史 RFC 仍保留在 `.spec/rfc/completed/`）。

行为上可参考 [Dark Reader Help](https://darkreader.org/help/en/)，实现为独立代码路径，非 fork。

## 仓库结构

| 路径 | 职责 |
|------|------|
| `apps/chrome/` | 扩展：MV3 service worker、content scripts、Popup；`@change-dark/chrome` |
| `apps/site/` | 落地页（React + Vite）；`@change-dark/site` |
| `packages/dark-engine/` | Rust/WASM 颜色计算；`@change-dark/dark-engine` |
| `packages/dark-color-utils/` | Rust 颜色算法 crate（单元测试） |
| `packages/dynamic-recolor/` | Stylesheet/inline 改色、`light-dark()`、WASM glue；`@change-dark/dynamic-recolor` |
| `packages/injected-styles/` | `buildDarkCss`、theme shell、`<style>` 注入；`@change-dark/injected-styles` |
| `packages/extension-settings/` | 常量、选择器、palette、storage；`@change-dark/extension-settings` |
| `packages/site-catalog/` | 站点 profile catalog（RFC 034）；`@change-dark/site-catalog` |
| `.spec/rfc/` | 规格正文；**RFC 索引**见 [ROADMAP.md](ROADMAP.md) |
| `.github/workflows/ci.yml` | 全仓 `pnpm` install、`build`、`test`、`lint`（含 `wasm32-unknown-unknown`） |
| `.github/workflows/deploy-github-pages.yml` | 仅构建 `@change-dark/site` 并部署 **GitHub Pages** |

编排：**pnpm workspaces** + **Turborepo**（`pnpm run build` 等）。

**Registry：** 各包 **`private: true`**，**不发布 npm**；`dist/` 与 `exports` 仅供 workspace 内消费。

## 构建与命令

**环境：** Node（CI 使用 22）、**pnpm** 9（见根目录 `packageManager`）、**Rust**（**rustup** + target **`wasm32-unknown-unknown`**，见 [`rust-toolchain.toml`](rust-toolchain.toml)）。本地需 **`wasm-pack`**（`pnpm install` 后可用）。若本机 **Homebrew `rustc`** 优先于 rustup，`dark-engine` 构建脚本会将 **`$HOME/.cargo/bin`** 置于 `PATH` 前以便解析 wasm 目标。

在**仓库根目录**执行：

```bash
pnpm install
pnpm run build    # Turbo：各包 build（dark-engine 先 wasm-pack）
pnpm run test
pnpm run lint
pnpm run dev      # Turbo：各包 dev（扩展需先有 WASM 产物）
pnpm --filter @change-dark/site dev   # 仅预览落地页
```

## GitHub Pages

**线上地址（项目 Pages）：** [https://luban-ws.github.io/change-dark/](https://luban-ws.github.io/change-dark/)

若仓库托管在其它 owner 下，URL 形如 `https://<owner>.github.io/<repo>/`。

1. 仓库 **Settings → Pages**：**Source** 选 **GitHub Actions**（勿与旧式 `gh-pages` 分支混用）。
2. 向 **`main`** 推送后，工作流 [`deploy-github-pages`](.github/workflows/deploy-github-pages.yml) 执行 `pnpm --filter @change-dark/site build` 并发布 `apps/site/dist`。
3. **`base` 路径**：CI 根据 `GITHUB_REPOSITORY` 设置；普通仓库为 `/{repo}/`；仓库名以 `.github.io` 结尾时为 `/`。可用 **`VITE_BASE_PATH`** 覆盖（须以 `/` 开头）。落地页内「查看仓库」等链接依赖 **`VITE_GITHUB_REPO`**（或 CI 注入的仓库名）。

## 本地加载扩展

1. 执行 `pnpm run build`。
2. Chrome → **扩展程序** → **开发者模式** → **加载已解压的扩展程序**。
3. 选择 **`apps/chrome/dist`**（须含 `manifest.json`；**不要**选 monorepo 根目录）。

## 文档与追踪

| 文档 | 内容 |
|------|------|
| [ROADMAP.md](ROADMAP.md) | **RFC 索引**、约定、下一编号、阶段与里程碑 |
| [RFC 001](.spec/rfc/completed/001-rust-wasm-monorepo-and-chrome-host.md) | 架构基线（Approved） |
| [RFC 023](.spec/rfc/completed/023-dynamic-color-engine-pipeline.md) | Dynamic 配色管线（采样 / 聚合语义） |
| [TASK_TRACKING.md](TASK_TRACKING.md) | 任务 ID 与 RFC 对应 |
| [RFC 021](.spec/rfc/completed/021-project-status-and-backlog.md) | 状态快照与 backlog（元文档） |
| [docs/chrome-web-store-listing.md](docs/chrome-web-store-listing.md) | Chrome 网上应用店：政策对齐、隐私 URL、权限英文稿、素材规格、ZIP 说明 |
| [docs/chrome-web-store-publish.md](docs/chrome-web-store-publish.md) | **发布步骤**：开发者账号、`pack`、后台上传/更新、（可选）Publish API |

## 打包说明（与实现一致）

各 workspace 包的 JS 面经 **Vite** 产出：

- **`@change-dark/dark-engine`**：`wasm-pack` 仅写入 gitignored 的 `pkg/`，再经 Vite 打成唯一发布目录 **`dist/`**（`index.mjs` 内联 WASM；`index.d.ts` 与 `index.cjs` 由 `scripts/finish-dist.mjs` 收尾）。
- **`@change-dark/dark-color-utils`**：Rust + Vite library → `dist/`（双端 `mjs`/`cjs` 以包内配置为准）。
- **`@change-dark/chrome`**：CRXJS + Vite → `apps/chrome/dist`。
- **`@change-dark/site`**：React 静态站 → `apps/site/dist`。

Scope：**`@change-dark/*`**（workspace 内 `private: true`，不发布 npm）。

## License

本仓库默认以根目录 [LICENSE](LICENSE)（MIT）为准；分发或上架前请确认与第三方依赖许可兼容。
