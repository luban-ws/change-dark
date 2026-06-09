# RFC 030 — Static 模式：覆盖边界与精炼路线图

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-043** |
| 创建日期 | 2026-04-19 |

**基线**：[RFC 015](./completed/015-theme-mode-static.md)、[RFC 012](./completed/012-theme-mode-dynamic.md)（互斥与回退）、[RFC 011](./completed/011-theme-filter-sliders.md)、[RFC 019](./completed/019-per-site-css-selector-fixes.md)（每站 CSS 扩展点）。

---

## 1. Summary

Static 通过 `STATIC_FALLBACK_RGB` 与 WASM 生成 `pageBg`/`pageFg`，再以 `buildStaticDarkCss` 中 **有限 `where(...)` 选择器** 铺色（RFC 015）。「漏一块」「卡片全 div 站不像暗色」常源于**选择器覆盖与站点 DOM 结构不匹配**，不是采样噪声（那是 Dynamic）。本文档固化这一语义，并列出**安全**的精炼方向（优先 RFC 019 每站 CSS，而非无限扩大全局选择器）。

---

## 2. 「准确性」定义

- **实现正确**：`buildDarkCss` + `buildStaticDarkCss` 与存储键、`ROOT_ATTR` 生命周期一致；与 Dynamic 切换无残留（RFC 015）。
- **视觉完整度**：不保证与站点原设计一一映射；**完整度**以「主阅读链路与根背景对比度」为渐进验收，而非全 DOM 像素。

---

## 3. 误差来源（根因级）

| 来源 | 说明 |
|------|------|
| 选择器粒度 | `main`/`p`/`section` 等无法覆盖自定义组件根节点 class |
| 第三方 widget | iframe / shadow 内不受 `buildStaticDarkCss` 约束（与 RFC 013 iframe 说明类似） |
| 与 RFC 011 组合 | 根上仍可能挂 `filter`；用户感知的「灰」可能来自滤镜链而非 Static 基色 |

---

## 4. 精炼目标

1. **选择器扩展策略**：任何全局选择器扩充必须经过**性能与特异性**评审；优先引导高级用户使用 RFC 019。
2. **文档**：在 Options 中链到「常见漏块 → 每站 CSS 模板」最小示例（仓库内 `docs/` 或站点，不强制本文档内嵌长 CSS）。
3. **快照测试**：`packages/shared` 中对 `buildStaticDarkCss` 快照随选择器变更更新（RFC 015 Testing 已建议 Vitest）。

---

## 5. Non-goals

- 不把 Static 改为全量 `*` 铺色（与图标字体、性能冲突，见 RFC 015 / shared `css.ts` 注释）。
- 不合并 Dynamic 采样进 Static（模式语义保持正交）。

---

## 6. 风险

| 风险 | 缓解 |
|------|------|
| 选择器膨胀导致不可维护 | 白名单式增加 + RFC 019 分流 |
| 与 RFC 011 双重调整观感 | 保持「与 Dynamic 相同根 filter」单一叙事（RFC 015 Decision） |

---

## 7. Decision log

- 2026-04-19：新建 Draft，作为 RFC 015 的覆盖策略与精炼 backlog。
