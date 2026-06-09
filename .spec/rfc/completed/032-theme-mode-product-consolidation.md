# RFC 032 — Dynamic-only 产品（移除 Static / Filter / Filter+）

| 字段 | 值 |
|------|-----|
| 状态 | **Completed** |
| 任务 ID | **T-045** |
| 创建日期 | 2026-06-09 |
| 完成日期 | 2026-06-09 |

**焦点**：全仓 **只交付 Dynamic**。

---

## 1. Goals 验收

| # | Goal | 状态 |
|---|------|------|
| 1 | Storage：`parseThemeMode` → `dynamic`；schema **v2** 写盘迁移 | ✅ `migration.ts` / `ensure-migrated.ts` |
| 2 | Popup 无模式单选 | ✅ |
| 3 | 内容脚本仅 Dynamic（无 Filter/Static 分支） | ✅ |
| 4 | 首屏：铺底 → recolor（`baseCss` 合并） | ✅ |
| 5 | Vitest + E2E Dynamic-only | ✅ |
| 6 | 027–030 → `rejected/` | ✅ |

---

## 2. 实现要点

- **`CURRENT_STORAGE_SCHEMA_VERSION = 2`**：写入 `change-dark:theme-mode=dynamic`；剥离 site-overrides 内 legacy `themeMode`。
- **删除** `wasmRecolorAvailable` 分支 — WASM 为硬依赖。
- **`buildStaticDarkCss`** 保留为 Dynamic 内部铺底（非用户 Static 模式）。

---

## 3. Decision log

- 2026-06-09：新建；Rejected 非 Dynamic 模式。
- 2026-06-09：**Completed** — 代码 + E2E + 文档同步。
