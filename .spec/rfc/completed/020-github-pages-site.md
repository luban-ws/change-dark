# RFC 020 — GitHub Pages 落地页（`apps/site`）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-032** |
| 创建日期 | 2026-03-29 |

依赖：[001](./001-rust-wasm-monorepo-and-chrome-host.md)（monorepo / Vite 约定）

## Summary

用 **React + Vite** 在 `apps/site` 提供项目介绍与「加载未打包扩展」说明；经 **GitHub Actions** 仅构建该包并部署到 **GitHub Pages**，与扩展产物（`apps/chrome/dist`）解耦。

## Goals

1. 静态资源在 **project Pages**（`https://owner.github.io/repo/`）下可用：`vite.config` 的 **`base`** 在 CI 中按仓库名推导为 `/{repo}/`；`*.github.io` 用户/组织站为 `/`。
2. 可通过 **`VITE_BASE_PATH`** 显式覆盖 base；可通过 **`VITE_GITHUB_REPO`**（或 CI 注入的 `GITHUB_REPOSITORY`）生成「查看仓库」链接。
3. 工作流 **`deploy-github-pages`** 使用 **`actions/upload-pages-artifact`** + **`actions/deploy-pages`**；仓库 **Settings → Pages** 的 **Source** 须为 **GitHub Actions**。

## Non-goals

- 不在此 RFC 中托管扩展 `.crx` / Chrome Web Store 跳转（另立 RFC）。
- 不强制与扩展共用同一构建任务（部署工作流可只跑 `pnpm --filter @luban-ws/site build`）。

## Implementation（验收对照）

| 产物 / 配置 | 路径 |
|-------------|------|
| 应用源码 | `apps/site/`（`App.tsx`、`vite.config.ts`、`index.html`） |
| 构建输出 | `apps/site/dist` |
| 部署工作流 | `.github/workflows/deploy-github-pages.yml` |
| 全仓 CI（build/test/lint） | `.github/workflows/ci.yml` |

## Risks

| 风险 | 缓解 |
|------|------|
| Pages 仍指向 `gh-pages` 分支 | 文档与 README 写明改选 **GitHub Actions** 源 |
| `base` 错误导致白屏 | CI 注入 `GITHUB_REPOSITORY`；本地可用 `VITE_BASE_PATH` 调试 |

## Testing

- `pnpm --filter @luban-ws/site test`（Vitest）。
- 本地：`pnpm --filter @luban-ws/site build` 后 `preview`，必要时 `VITE_BASE_PATH=/repo/` 模拟子路径。

## Decision log

- 2026-03-29：与用户已落地的 `apps/site` + `deploy-github-pages` 对齐，本 RFC **Approved**；全仓回归 CI 恢复为 `ci.yml`。
