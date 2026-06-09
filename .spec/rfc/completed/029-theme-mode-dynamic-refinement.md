# RFC 029 — Dynamic：唯一产品主题（引擎 RFC 031 + 内部铺底）

| 字段 | 值 |
|------|-----|
| 状态 | **Completed** |
| 任务 ID | **T-042** |
| 创建日期 | 2026-04-19 |
| 完成日期 | 2026-06-09 |

**基线**：[RFC 031](./031-dynamic-recolor-engine.md) ✅、[RFC 032](./032-theme-mode-product-consolidation.md) ✅、[RFC 026](./026-e2e-testing-strategy.md) ✅。

**Rejected（不再做）**：[RFC 027](../rejected/027-theme-mode-filter-css-refinement.md)、[RFC 028](../rejected/028-theme-mode-filter-plus-refinement.md)、[RFC 030](../rejected/030-theme-mode-static-refinement.md)。

---

## 0. 唯一产品 = Dynamic

```
① 铺底 — buildSampledBaseCss + buildStaticDarkCss（首屏必暗）
② 改色 — paintRecolorPath（baseCss 合并）+ MO
```

---

## 1. Backlog 结案

| ID | 项 | 状态 |
|----|-----|------|
| D-1 | 先铺底再改色 | ✅ `index.ts` + `recolor-path.ts` |
| D-2 | 唯一 `theme-mode=dynamic` + schema v2 迁移 | ✅ |
| D-3 | `resolveDynamicBaseRgbWithBranch` | ✅ |
| D-4 | `hasReadableStylesheetCss` | ✅ |
| D-5 | MO + 晚到 stylesheet | ✅ |
| D-6 | E2E P0 | ✅ RFC 026 |
| D-7 | RFC 031 Phase 2（CSS 变量计算值等） | **Deferred → RFC 033+** |

---

## 2. Decision log

- 2026-06-06：单色主路径 Dead → RFC 031。
- 2026-06-09：Dynamic-only 产品；移除 `wasmRecolorAvailable` 假降级。
- 2026-06-09：**Completed**；D-7 不阻塞本 RFC。
