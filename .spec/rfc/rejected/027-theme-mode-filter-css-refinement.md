# RFC 027 — Filter（CSS）模式：语义澄清（**Dropped**）

| 字段 | 值 |
|------|-----|
| 状态 | **Rejected** — 产品范围移除（`rejected/`） |
| 任务 ID | **T-040** |
| 创建日期 | 2026-04-19 |
| 更新日期 | 2026-06-09 |

**历史实现**：[RFC 013](./completed/013-theme-mode-filter-css-invert.md)（已完成，仅作归档参考）。

**产品决定（2026-06-09）**：**只聚焦 Dynamic**。Filter / Filter+ **从 Popup、文档、E2E、新功能中删除**；代码移除与 storage 迁移见 [RFC 032](../032-theme-mode-product-consolidation.md)。

---

## 0. Dropped — 不再做任何事

| 项 | 状态 |
|----|------|
| Filter 作为用户可选模式 | **Dropped** |
| §4 全部精炼 backlog | **Dropped** |
| Filter E2E / 视觉回归 / Popup 文案维护 | **Dropped** |
| 「Maintenance 冻结」叙事 | **废止** → 改为 **移除** |

**仍可读**：§2 反相语义（解释旧 issue / 历史 PR 用）；**不**再指导新开发。

---

## 1. Summary（归档）

Filter = 整页 CSS 反相 + 媒体补偿。与 Dynamic（RFC 031 逐色改色）**无关**；产品已决定 **不提供** 此路径。

---

## 2. Decision log

- 2026-04-19～2026-05-17：Draft / 实现精炼（历史）。
- 2026-06-09：误标 Maintenance → 更正为 **Dropped**；全仓只交付 Dynamic（RFC 032）。
