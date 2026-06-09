# RFC 026 — E2E：仅 Dynamic

| 字段 | 值 |
|------|-----|
| 状态 | **Completed** |
| 任务 ID | **T-039** |
| 创建日期 | 2026-04-06 |
| 完成日期 | 2026-06-09 |

**产品范围**：**只测 Dynamic**。Static / Filter / Filter+ 已 **Rejected**（[RFC 027–030](../rejected/027-theme-mode-filter-css-refinement.md)）— **无** E2E 用例。

---

## 1. 目标

- Dynamic 首屏铺底 + 改色 + MO 升级
- Auto/On/Off + 原生暗避让（RFC 025）
- Popup：policy 持久化（无模式切换）

---

## 2. P0 用例（已实现）

| # | 用例 | 实现 |
|---|------|------|
| 1 | 首屏暗底 | `e2e/dynamic.spec.ts` P0-1 |
| 2 | 同源 CSS 改色 | P0-2 |
| 3 | 无 readable CSS 仍铺底 | P0-3 |
| 4 | 晚到 `<style>` | P0-4 |
| 5 | Auto 原生暗不注入 | P0-5 |
| 6 | Auto 阈值 | P0-6 |
| — | Popup policy 持久化 | `dynamic.spec.ts` popup 段 |

**Fixture**：`apps/chrome/e2e/pages/` + `serve-fixtures.mjs`（`:4173`）。

---

## 3. 架构

- Playwright + `launchPersistentContext` + `--load-extension=dist`
- 默认 **headed**（MV3 SW 可靠）；`HEADLESS=true` 时可能无法发现 SW
- 前置：`pnpm --filter @luban-ws/chrome build` + `pnpm exec playwright install chromium`

---

## 4. Decision log

- 2026-04-06：新建。
- 2026-06-09：**仅 Dynamic**；删除 Filter/Static E2E。
- 2026-06-09：**Completed** — `e2e/dynamic.spec.ts` + helpers 落地，P0 全绿。
