# RFC 035 — Chrome Web Store 发布（v0.1.2+）

| 字段 | 值 |
|------|-----|
| 状态 | **Draft** |
| 任务 ID | **T-048** |
| 创建日期 | 2026-06-27 |
| 目标版本 | **`0.1.2`**（或审核通过后递增 patch） |
| 基线 | [020](./completed/020-github-pages-site.md)、[026](./completed/026-e2e-testing-strategy.md)、[032](./completed/032-theme-mode-product-consolidation.md) |
| 操作指南 | [docs/chrome-web-store-publish.md](../../docs/chrome-web-store-publish.md) |
| **后台填写手册** | [docs/chrome-web-store-dashboard-fill-guide.md](../../docs/chrome-web-store-dashboard-fill-guide.md) |
| Listing 对齐 | [docs/chrome-web-store-listing.md](../../docs/chrome-web-store-listing.md) |

---

## 1. Summary

将 **嫦娥 / Selena** 从「可本地打包 + GitHub Release」推进到 **Chrome Web Store 可提交审核** 的下一版（建议 **`0.1.2`**）。本 RFC 不引入新产品功能；聚焦 **质量门禁、文案/素材一致、版本递增、人工提交流程**。

**已有资产（2026-06-27 审计）：**

| 项 | 状态 |
|----|------|
| GitHub Releases `v0.1.0` / `v0.1.1` + ZIP | ✅ |
| `pnpm release:chrome` / `pack` | ✅ |
| 隐私页 `https://luban-ws.github.io/change-dark/privacy.html` | ✅ HTTP 200 |
| 商店素材 `docs/publish/`（1280×800、440×280、icon-128） | ✅ 存在 |
| `docs/publish/*` Dynamic-only 文案 | ✅（2026-06-22） |
| CI `main` 全绿 | ✅ 本地 `pnpm run test` 全绿（A1 surface sweep 已修） |
| E2E P0（RFC 026）发布前验证 | ✅ 本地 10/10 通过 |
| `chrome-web-store-listing.md` 与 Dynamic-only 一致 | ✅ 2026-06-28 |

---

## 2. Motivation

1. **Dynamic-only 产品整合（RFC 032）** 与 **命名空间拆分（`@change-dark/*`）** 已落地，但商店 listing 后台文案、权限理由、长描述仍有历史模式用语，存在 **Deceptive behavior / 权限说明不一致** 拒审风险。
2. **`main` CI 红**（`visible-light-surface-sweep.test.ts` 在 Ubuntu/jsdom 失败）无法在合并后证明 Linux 环境质量，不宜在 CI 红状态下提审。
3. **E2E 未纳入发布门禁**：RFC 026 P0 用例覆盖首屏铺底、改色、Auto 原生暗、Popup 持久化，应在提审前至少 **headed 或 CI 跑通一次**。
4. 需要 **一事一 RFC** 追踪发布任务，避免 checklist 散落在对话或未关闭的 backlog 行。

---

## 3. Scope

### In scope

- 修复 CI 阻塞用例（Linux/jsdom 兼容，根因修复非 skip）。
- 发布前跑通 RFC 026 P0 E2E（本地或 CI job）。
- 同步 `docs/chrome-web-store-listing.md` §4.1、§6、权限理由与 **Dynamic-only** / 当前 popup 能力。
- 核对 `docs/publish/` 截图是否反映当前 UI（Dynamic-only popup）；过时则重截。
- 递增 `apps/chrome/package.json` `version` → **`0.1.2`**（若商店已有更高版本则再 bump patch）。
- `pnpm --filter @change-dark/chrome run pack` → 上传 Developer Dashboard → **Submit for review**。
- 可选：`pnpm release:chrome -- --bump patch` 同步 Git tag + GitHub Release（与商店版本号一致）。

### Out of scope

- Chrome Web Store **Publish API** / CI 自动上传（见 publish 文档 §5，后续 RFC）。
- 新功能（033 Surface Repair、034 Site Catalog 未完成项不阻塞本 RFC，除非审核明确要求）。
- Firefox Add-ons / Edge Add-ons 分发。

---

## 4. Release gates（必须全绿才提审）

| # | 门禁 | 命令 / 证据 | 当前 |
|---|------|-------------|------|
| G1 | Monorepo 构建 | `pnpm run build` | ✅ |
| G2 | 单元测试 | `pnpm run test` | ✅ |
| G3 | Lint | `pnpm run lint` | ✅ |
| G4 | E2E P0 | `pnpm --filter @change-dark/chrome run test:e2e` | ✅ 本地 10/10 |
| G5 | 扩展打包 | `pnpm --filter @change-dark/chrome run pack` | ✅ `0.1.2` |
| G6 | 本地 smoke | 加载 `apps/chrome/dist`，抽测 2–3 站 | ☐ 人工（提审前） |
| G7 | 隐私 URL | 无痕打开 privacy.html → 200 | ✅ |
| G8 | Listing 文案 | listing + publish 与 manifest / 实际功能一致 | ✅ |
| G9 | 版本号 | `version` > 商店线上版 | ✅ `0.1.2`（待上传） |

---

## 5. Work breakdown

### Phase A — 质量（阻塞）

| ID | 任务 | 验收 |
|----|------|------|
| A1 | 稳定 surface sweep 单测（`parseCssRgbToTriplet` 纯 TS rgb 路径 + 不 spread CSSStyleDeclaration mock） | `pnpm run test` 绿 |
| A2 | 发布前 E2E：安装 Chromium + 跑 P0 | `e2e/dynamic.spec.ts` + smoke 全绿 |
| A3 |（可选）CI 增加 `test:e2e` job 或 `workflow_dispatch` 发布门禁 | 文档化触发方式 |

### Phase B — 商店材料

| ID | 任务 | 验收 |
|----|------|------|
| B1 | 更新 `chrome-web-store-listing.md`：Single purpose、storage 理由、§6 长描述 → Dynamic-only | 无 Filter/Static/「multiple theme modes」对外表述 |
| B2 | 商店截图与当前 popup 一致 | `pnpm run screenshots:store` → `docs/publish/screenshot-*-1280x800.png` |
| B3 | 确认 `CWS_SHORT_DESCRIPTION` ≤132 字符且与后台 Short description 一致 | `store-listing-meta.test.ts` 绿 |
| B4 | 权限理由粘贴稿与 manifest 一致（仅 `storage` + `<all_urls>`） | 后台表单可逐条粘贴 |

### Phase C — 版本与提交

| ID | 任务 | 验收 |
|----|------|------|
| C1 | Bump `apps/chrome/package.json` → `0.1.2` | manifest 构建产物 version 同步 |
| C2 | `pack` 生成 ZIP；可选 `release:chrome` tag | `change-dark-extension.zip` 可上传 |
| C3 | Developer Dashboard 上传 + 填 Privacy practices（Remote code **No**） | 提交审核 |
| C4 | 记录审核结果 / 拒审理由到本 RFC Decision log | 可追溯 |

---

## 6. Version & release commands

```bash
# 1. 质量门禁
pnpm run build && pnpm run test && pnpm run lint
pnpm --filter @change-dark/chrome exec playwright install chromium
pnpm --filter @change-dark/chrome run test:e2e

# 2. 打包（手动 bump version 后）
pnpm --filter @change-dark/chrome run pack

# 3. 可选：GitHub Release（与商店版本对齐）
pnpm release:chrome -- --bump patch --commit
```

**版本源**：`apps/chrome/package.json` → `manifest.config.ts` → `dist/manifest.json`。

---

## 7. Risks

| 风险 | 缓解 |
|------|------|
| `<all_urls>` 权限拒审 | 使用 listing 文档英文理由；强调 document_start 防白闪、无 tabs 冗余权限 |
| 截图与功能不符 | B2 重截；勿用 Filter/Static UI |
| CI 仅 macOS 绿 | A1 必须在 Ubuntu 验证 |
| 首次 listing vs 更新 | 若商店无条目，需完整 Store listing + Privacy；若已有 v0.1.x，Package 页上传即可 |
| 033/034 进行中代码进包 | 本 RFC 不强制等功能完成；以 G1–G9 与 smoke 为准 |

---

## 8. Acceptance criteria（RFC 完成）

1. **G1–G5、G7–G9** 全部 ✅。
2. **G6** smoke 记录（站点列表 + 结果）写入 Decision log 或 PR 描述。
3. Chrome Web Store 状态为 **Pending review** 或 **Published**（`0.1.2+`）。
4. 本 RFC 状态 → **Completed**，归档至 `.spec/rfc/completed/`。

---

## 9. Decision log

- 2026-06-28：**Ready for submit** — G1–G5、G7–G9 ✅；`0.1.2` ZIP 已 pack；listing Dynamic-only；E2E 10/10；待 Dashboard 上传 + G6 smoke。
- 2026-06-27：**Draft** — 基于发布就绪审计创建；目标版本 `0.1.2`；CI/E2E/listing 为阻塞项。
