# RFC 0042: CI 性能门禁、中位数基准与 PR 报告防回退

**Status:** Implemented

## Summary

将 RFC 0040/0041 的本地 Popup 启动性能成果固化为可持续运行的 GitHub Actions CI 门禁：以版本化配置 `apps/chrome/perf-budget.json` 约束静态产物体积与运行时中位数（`p50`）及单次存储 IPC 预算，升级 `e2e/popup-perf.spec.ts` 输出结构化 `perf-report.json`，新增 `format-perf-summary.mjs` 将报告写入 `$GITHUB_STEP_SUMMARY`，并在 `.github/workflows/ci.yml` 增加依赖 `build-test-lint` 的 `e2e-perf` Job。

## Problem

1. 当前 `.github/workflows/ci.yml` 仅执行 `build` / `test` / `lint`，未运行 Playwright E2E 与 `popup-perf.spec.ts`，无法在 PR 合并前自动拦截体积膨胀、重新引入阻塞 `<link rel="stylesheet">`、`storage` 多次 IPC 回归或启动变慢问题。
2. 单次测量在共享 CI runner（`ubuntu-latest`）上容易受 CPU 抖动影响，需要以多轮热启动中位数（`p50`）配合零抖动静态预算与 IPC 计数作为门禁。
3. CI 缺少可读的 PR 摘要表与可下载趋势报告产物。

## Goals

1. 版本化维护 `apps/chrome/perf-budget.json`，统一约束静态预算（HTML/入口 JS/裁剪 CSS/异步 JS/内容脚本/单一 WASM data URL）与运行时预算（5 轮热启动 `p50` DCL/Load/FCP/FullUI、冷启动因 `onInstalled` 迁移允许 `storageGets <= 2`，以及所有热启动 `storageGets === 1` / `tabQueries === 1` / `storageSets === 0`）。
2. `apps/chrome/e2e/popup-perf.spec.ts` 跑 1 轮冷启动 + 5 轮热启动，校验确定性指标与热启动 `p50` 不越界，并将完整结果写入 `apps/chrome/test-results/perf-report.json`。
3. 新增 `apps/chrome/scripts/format-perf-summary.mjs`，格式化 Markdown 对比表并在 CI 中追加至 `$GITHUB_STEP_SUMMARY`。
4. `.github/workflows/ci.yml` 保持现有 `build-test-lint` Job 名称稳定，上传扩展构建产物并在新增 `e2e-perf` Job 中安装/缓存 Playwright Chromium、运行 `test:perf`、生成 summary 与上传 `perf-report.json` 产物。

## Non-goals

1. 不在无凭证的仓库环境自动修改 GitHub Branch Protection / Rulesets（留给仓库管理员按需将 `e2e-perf` 设为 Required check）。
2. 不引入外部第三方性能 SaaS 服务或向 `gh-pages` 推送历史数据。

## Design

1. `apps/chrome/perf-budget.json`：定义 `static` 与 `runtime` 两类阈值。
2. `apps/chrome/e2e/popup-perf.spec.ts`：读取 `perf-budget.json`，在静态预算测试与 1+5 轮 Chromium 实测中校验阈值并合并输出 `apps/chrome/test-results/perf-report.json`。
3. `apps/chrome/scripts/format-perf-summary.mjs` & `apps/chrome/package.json`：提供 `test:perf` 与 `perf:summary` 脚本；`playwright.config.ts` 将 HTML reporter 配置为 `open: 'never'` 避免失败时阻塞退出。
4. `.github/workflows/ci.yml`：顶层声明最小只读 `permissions: { contents: read }`，`build-test-lint` 上传 `chrome-extension-dist`，`e2e-perf` 下载产物、恢复 `~/.cache/ms-playwright` 缓存并执行门禁与报告汇总。

## Acceptance

1. `.github/workflows/ci.yml` YAML 语法校验通过，保留 `build-test-lint` 且新增 `e2e-perf`。
2. `HEADLESS=true pnpm --filter @change-dark/chrome run test:perf` 与 `pnpm --filter @change-dark/chrome run perf:summary` 本地执行通过，生成 `perf-report.json` 与全部 `PASS` 的 Markdown 汇总表。
3. `specify validate` 与 `specify sync-check` 通过。
