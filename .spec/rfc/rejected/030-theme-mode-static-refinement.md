# RFC 030 — Static 模式（**Dropped**）

| 字段 | 值 |
|------|-----|
| 状态 | **Rejected** — 用户可见模式移除（`rejected/`） |
| 任务 ID | **T-043** |
| 创建日期 | 2026-04-19 |
| 更新日期 | 2026-06-09 |

**历史实现**：[RFC 015](./completed/015-theme-mode-static.md)。

**产品决定（2026-06-09）**：**不提供 Static 模式选项**。`buildStaticDarkCss` **保留为 Dynamic 内部铺底/回退**（函数名历史遗留），**不是**独立主题模式。见 [RFC 029](../029-theme-mode-dynamic-refinement.md)、[RFC 032](../032-theme-mode-product-consolidation.md)。

---

## 0. Dropped vs 内部复用

| 项 | 状态 |
|----|------|
| Popup「Static」单选 | **Dropped** |
| `THEME_MODE_STATIC` 用户可选 | **Dropped**（迁移 → `dynamic`） |
| `buildStaticDarkCss` / `paintSampledFallbackPath` | **Live** — Dynamic **内部**回退，非第二模式 |
| §4 选择器扩展作为 Static 模式精炼 | **Dropped**（漏块 → RFC 019 仍可用） |

---

## 1. Decision log

- 2026-04-19：Draft（历史）。
- 2026-06-09：**Dropped** 用户模式；铺底 CSS 并入 Dynamic 唯一产品。
