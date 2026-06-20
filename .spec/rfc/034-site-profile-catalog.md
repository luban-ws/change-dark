# RFC 034 — Site Profile Catalog（数据驱动站点策略，超越 Dark Reader）

| 字段 | 值 |
|------|-----|
| 状态 | **Approved**（Phase 1 骨架落地） |
| 任务 ID | **T-047** |
| 创建日期 | 2026-06-08 |
| 基线 | [031](./completed/031-dynamic-recolor-engine.md)、[033](./033-cross-site-surface-repair-layer.md)、[019](./completed/019-per-site-css-selector-fixes.md)、[016](./completed/016-only-for-per-site-overrides.md) |

---

## 1. Summary

引入 **Site Profile Catalog**：版本化 JSON 描述每站对通用引擎（031 Recolor + 033 Surface Repair）的**结构化补丁**。引擎保持固定；长尾站点通过 **数据** 扩展，而非 TS 硬编码或巨型 `if (host)`。

相对 Dark Reader 的 `dynamic-theme-fixes.config`（自定义 DSL + 原始 CSS 块），本 RFC 提供：

1. **JSON Schema** 可校验、可单测、可 IDE 补全  
2. **声明式引擎旋钮**（`neverPaint`、`landmarkSelectors`、`cssVarSubstitute`）优先于裸 CSS  
3. **Rust/WASM 批改色** 仍为热点；站点数据只调 policy，不重写颜色算法  
4. **分层合并**：Global → Bundled catalog → Remote（可选）→ User storage → Custom CSS（019 逃生舱）

---

## 2. 为何需要 Catalog（承认长尾）

| 现实 | 对策 |
|------|------|
| 无法预知所有 DOM / 设计系统 | L1/L2 通用启发式覆盖主干 |
| 单站仍有 border/`var()`/透明层叠特例 | L3 catalog 条目 |
| 高级用户要完全控制 | L4 RFC 019 custom CSS |

**目标不是「百科全书」**，而是 **50–200 条高流量 bundled profile + 用户可扩展**。

---

## 3. 相对 Dark Reader 的差异（必须更好）

| 维度 | Dark Reader | 嫦娥 / Selena（本 RFC） |
|------|-------------|-------------------------|
| 站点数据格式 | 自定义 `.config` DSL（`INVERT` / `CSS` / `IGNORE…`） | **JSON Schema v1**，与引擎 policy 一一对应 |
| 修复手段 | 主要是 **追加 CSS 文本** + 变量模板 `${white}` | **Policy 旋钮** + 可选 `customCss`；引擎读 policy 改行为 |
| 颜色计算 | TypeScript `modifyColors` | **Rust/WASM `batchModifyColors`**（031） |
| 通用层 | Dynamic theme + 巨大 fixes 文件（~700KB+） | **031+033 通用层**；catalog **只补缝**，体积可控 |
| 负向规则 | 分散在 CSS / IGNORE 指令 | 一等公民 **`neverPaint`**（防透明壳被铺底） |
| 用户扩展 | Dev tools 文本；fixes 需 PR 进上游 | **per-origin JSON patch**（storage）+ 导入导出；bundled 可远程签名更新 |
| 测试 | 社区 PR 人工审 | **每 profile 绑定 fixture / e2e**；CI `resolveSitePolicy` 单测 |
| Filter 模式 fixes | `inversion-fixes.config` 另一套 | **产品仅 Dynamic**（032）；单一 catalog 类型 |
| 性能 | TS 主线程改色 | WASM 批处理 + RFC 006 预算墙 |

**定位**：DR 用 **CSS 海** 淹没问题；我们用 **强通用引擎 + 小份结构化数据**，更少误伤、更易自动化测试、更快。

---

## 4. 架构：五层合并

```
L0  WASM modifyColor                    （颜色数学）
L1  Recolor Engine                      （RFC 031）
L2  Surface Repair                      （RFC 033）
L3  Site Profile Catalog                （本 RFC）
L4  User custom CSS                     （RFC 019）
```

合并顺序（后者覆盖/追加前者，**`neverPaint` 为并集**）：

```
GLOBAL_DEFAULT_POLICY
  ← match(bundled catalog entries)* 按 priority 排序
  ← match(remote catalog)*           （可选，签名）
  ← userSiteProfilePatch[origin]     （storage）
  ← sanitize(siteCustomCss)          （仅 CSS 文本，最后）
```

---

## 5. Site Profile Schema v1

```typescript
interface SiteProfileV1 {
  v: 1
  id: string                    // 稳定 id，如 "google-marketing-platform"
  match: {
    hostEquals?: string[]       // 精确 host
    hostSuffix?: string[]       // 后缀匹配
    pathPrefix?: string[]       // pathname 前缀
  }
  priority?: number             // 默认 0，高者优先合并
  surfaceRepair?: {
    landmarkSelectors?: string[]
    componentClassHints?: string[]   // 额外 RegExp 源串
    neverPaint?: string[]
    minPanelAreaPx?: number
    gutterProbe?: { mainSelector: string; insetPx: number }
  }
  recolor?: {
    forceShorthandProperties?: string[]
    cssVarSubstitute?: Record<string, { use: 'bg'|'fg'|'border'; fallback?: string }>
  }
  customCss?: string            // 最后手段；走 sanitize
}
```

**User patch**（`SiteProfilePatchV1`）：与上同结构的 `Partial`，外加 `disabled?: boolean` 禁用 bundled 匹配项。

---

## 6. 包边界

| 包 | 职责 |
|----|------|
| `@change-dark/site-catalog` | Schema 类型、`matchSiteProfiles`、`mergeSitePolicies`、`resolveSitePolicy`、bundled JSON |
| `@change-dark/extension-settings` | storage：`siteProfilePatch` 并入 `SiteOverrideEntryV1`（或独立键） |
| `apps/chrome/content` | `resolveSitePolicyForPage()` → 传入 L1/L2 |
| `packages/dynamic-recolor` | 消费 `policy.recolor`（Phase 1.5：`cssVarSubstitute`） |

目录：

```
packages/site-catalog/
  src/
    types.ts
    defaults.ts
    match.ts
    merge.ts
    resolve.ts
    catalog/*.json
    __tests__/
```

---

## 7. Phase 1 范围（本 PR）

| 项 | 状态 |
|----|------|
| `@change-dark/site-catalog` 包 + 单测 | ✅ |
| `google-marketing-platform.json` 样板 | ✅ |
| L2 消费 `ResolvedSurfaceRepairPolicy` | ✅ |
| `gutterProbe` 读 policy | ✅ |
| storage user patch | ⏳ Phase 1.5 |
| remote signed catalog | ⏳ Phase 2 |
| `cssVarSubstitute` in recolor | ⏳ Phase 1.5 |
| Popup 编辑 / 导入导出 | ⏳ Phase 2 |

---

## 8. 验收

1. `resolveSitePolicy('https://marketingplatform.google.com/about/')` 返回 GMP profile 合并结果。  
2. `neverPaint` 含 `.h-c-page` 时，`shouldPaintOpaqueLightSurface` 为 false。  
3. 无匹配站点 → 纯 `GLOBAL_DEFAULT_POLICY`，行为与 033 一致。  
4. Catalog 条目 **不** 含 TS 硬编码 host 判断（grep 门禁）。  

---

## 9. Tasks

| ID | 内容 |
|----|------|
| T-047-1 | RFC 034 + ROADMAP/TASK_TRACKING |
| T-047-2 | `site-catalog` 包、GMP JSON、单测 |
| T-047-3 | content 接线 `resolveSitePolicyForPage` |
| T-047-4 | user storage patch + Popup |
| T-047-5 | remote catalog + 签名 |
| T-047-6 | `cssVarSubstitute` recolor 路径 |

---

## 10. 参考

- DR：`src/config/dynamic-theme-fixes.config`、`config-manager.ts`  
- 本仓库：RFC 019 custom CSS、RFC 033 surface heuristics  
