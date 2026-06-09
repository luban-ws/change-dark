# RFC 031 — Dynamic 逐规则改色引擎（对齐 Dark Reader → Rust 反超）

| 字段 | 值 |
|------|-----|
| 状态 | Completed（Phase 1） |
| 任务 ID | **T-044** |
| 创建日期 | 2026-06-06 |
| 批准日期 | 2026-06-06 |

**基线**：[RFC 029](../029-theme-mode-dynamic-refinement.md)（判定旧采样单色路径到顶）、[RFC 023](./023-dynamic-color-engine-pipeline.md)（采样管线，本 RFC 降级为回退）、[RFC 005](./005-wasm-batch-color-api.md)（WASM 批 API 形状）、[RFC 025](./025-policy-mode-behavior-matrix.md)（策略×模式）。

**对照**：Filter/Filter+（[RFC 027](../027-theme-mode-filter-css-refinement.md) / [RFC 028](../028-theme-mode-filter-plus-refinement.md)）经核对与 Dark Reader 语义一致，**不在本 RFC 范围**。

---

## 1. Summary

把 Dynamic 从「采样 → 单色铺全站」重做为**逐条 CSS 规则、逐个颜色值改色**引擎。两阶段：**Phase 1 对齐 Dark Reader 观感；Phase 2 拉开性能差距**。根因判定见 RFC 029 §0。

### 1.1 核心原则 —— Rust/WASM 算一切热点，碾压 TS

DR 全 TS，软肋 = 重站首屏卡、主线程被颜色计算占满。本引擎的**根本差异化**：

> **所有热路径（颜色变换、颜色解析、像素亮度、缓存）跑 Rust/WASM；TS 只碰 DOM。** 单页可达**上万**次颜色变换 —— 这正是 TS 逐次调用 + GC 抖动的死穴，也是 Rust 批处理 + 线性内存 + 零 GC 的主场。

不是「先 TS 跑通再考虑 Rust」。是 **Rust 即引擎，第一版就在 WASM**（现状 `dark-engine::modifyColor`/`batchModifyColor` 已落地）。TS 写颜色算法 = 反模式，本 RFC 禁止（§4.0.1）。

---

## 2. 颜色变换规格 `modifyColor`

> **来源（已核对源码 2026-06-06）**：Dark Reader `src/inject/dynamic-theme/modify-colors.ts`。常量与色相区间逐项从源码确认，非二手摘要。下次实现前若 DR 主分支更新，须重新核对本节。

管线：**RGB → HSL → 按色用途分段映射 → HSL → RGB**。非 `invert(1)`。

### 2.1 常量（verbatim）

| 常量 | 值 | 用途 |
|------|----|----|
| `MAX_BG_LIGHTNESS` | `0.4` | 背景亮度上限 |
| `MIN_FG_LIGHTNESS` | `0.55` | 前景亮度下限 |
| **pole（极色）** | bg = `darkSchemeBackgroundColor`；fg = `darkSchemeTextColor` | 中性色收敛目标。**本仓库决定**：pole 取本仓库 `dark`/`solarized-dark` 调色板底/字色（与 Filter/Static 同源，RFC 027 §2.1），**不引入 DR 独立配置**。`dark` 默认 ≈ bg `#181a1b` / fg `#e8e6e3`（DR 默认值，本仓库可调）。§6 该项已决，不再开放。 |

### 2.2 分段映射

| 函数 | 输入 | 亮度映射 |
|------|------|----------|
| `modifyBgHSL` | 暗 `L < 0.5` | `L: [0,0.5] → [0, MAX_BG_LIGHTNESS(0.4)]` |
| | 亮 `L ≥ 0.5` | `L: [0.5,1] → [0.4, pole.l]` |
| `modifyFgHSL` | 亮 `L > 0.5` | `L → [MIN_FG_LIGHTNESS(0.55), pole.l]` |
| | 暗 | `L → [pole.l, 0.55]` |
| `modifyBorderHSL` | 全部 | `L: [0,1] → [0.5, 0.2]`（**反向**，亮边框压暗、暗边框提亮到窄区） |

### 2.3 色相特判（verbatim）

- **黄相** `60 < h < 180`：偏黄 `60–120 → 60–105`；偏绿 `120–180 → 135–180`；且 `40 < hx < 80` 时 `lx *= 0.75`（压黄绿亮度）。
- **蓝相前景** `205 < h < 245`（亮主题放宽 `200–280`）：`modifyBlueFgHue` 压到 `205–220` 提可读性。

### 2.4 中性色判定（采用 pole 的 hue/sat 而非保留原色）

- 前景中性：`L < 0.2 || S < 0.24`
- 背景中性：`L < 0.2 || S < 0.24`，外加极亮蓝 `L > 0.8 && isBlue`

> 注：RFC 029 旧 §0.1 曾写背景中性 `S < 0.12` — **错误，源码为 `S < 0.24`**，本节为准。

### 2.5 缩放公式与转换（实现细节）

**线性缩放**（所有亮度映射的基元）：
```
scale(x, inLo, inHi, outLo, outHi) = outLo + (x - inLo) * (outHi - outLo) / (inHi - inLo)
```
例：`modifyBgHSL` 暗色分支 = `scale(l, 0, 0.5, 0, 0.4)`；亮色分支 = `scale(l, 0.5, 1, 0.4, pole.l)`。

**色彩空间**：sRGB `[0,255]` ↔ HSL `H[0,360) S[0,1] L[0,1]`。变换只动 H/S/L（按 §2.2–2.4），不走 gamma 线性化（与 DR 一致，sRGB 内直算）。alpha 透传不变。

### 2.6 哪些 CSS 属性参与改色

| 类别 | 属性 | 用 modify* |
|------|------|-----------|
| 背景 | `background-color`、`background`(色 token)、`background-image`(渐变色标) | `modifyBgHSL` |
| 前景 | `color`、`caret-color`、SVG `fill`(文字/图标语义) | `modifyFgHSL` |
| 边框 | `border-color`、`outline-color`、`border`(色 token)、`column-rule-color` | `modifyBorderHSL` |
| 阴影 | `box-shadow`、`text-shadow` 内颜色 | `modifyBgHSL` |
| 背景图 | 位图背景 → §5.1 亮度分析，非 `modifyColor` | 图路径 |

**阴影为何用 bg 曲线（Linus：说清理由，非照抄 DR）**：阴影在视觉上是**背景面的延伸**（投在底色上的暗/亮扩散），不是文字。亮主题阴影多为浅灰扩散；暗主题需同样「比底色略暗/略亮的扩散」——bg 曲线把浅灰压暗正好匹配，用 fg 曲线会把阴影提成亮色、视觉爆开。故 bg 曲线是语义对的，非 DR quirk。

未列属性（`transition`/布局等）不动。`!important` 覆盖回写，防被站点 author 规则盖掉。

### 2.7 Golden 向量（Kent：先有失败测试）

第一批红测试。值由 **§2 算法手算**（pole bg.l≈0.1 / fg.l≈0.9，`dark` 默认）。**实现前必须对 live Dark Reader 抓真值校准本表**，差异 >ΔE 容差则以 DR 为准回填——本表是「待校准的预期」，非已验证真值。

| 输入 | 用途 | §2 算法预期输出 | 推导 |
|------|------|----------------|------|
| `#ffffff` | bg | `≈ #181a1b` | L=1 亮分支 `scale(1,0.5,1,0.4,pole.l)` → pole.bg |
| `#000000` | bg | `≈ #000000` | L=0 暗分支 `scale(0,0,0.5,0,0.4)`=0 |
| `#808080` | bg | `≈ #2e2e2e` | L≈0.5 边界 → ~0.4 上限附近压暗 |
| `#f0f0f0` | bg | `≈ #1f2122` | 近白浅灰 → 近 pole.bg |
| `#000000` | fg | `≈ #e8e6e3` | L=0 暗 fg → 提到 pole.fg |
| `#ffffff` | fg | `≈ #e8e6e3` | L=1 已亮 → pole.fg |
| `#333333` | fg | `≈ #c8c6c3` | 深字提亮到可读区 |
| `#1a73e8`(蓝链) | fg | `蓝相压 205-220°，L 提至 ≥0.55` | `modifyBlueFgHue` + fg 曲线 |
| `#cccccc` | border | `≈ 压到 L0.2-0.5 区` | border 反向曲线 |
| `#ffeb3b`(黄) | bg | `黄相 60-105°，lx*=0.75` | 黄相特判 |

容差：建议 **CIEDE2000 ΔE ≤ 3**（肉眼几乎不可辨）。校准脚本：注入测试页 → DR 开 → 读 computed → 对表。

---

## 3. 引擎管线（区别于 RFC 023 采样管线）

```
┌──────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐
│ ① 收集 CSS 规则  │ → │ ② 逐规则改色         │ → │ ③ 注入覆盖样式       │
│ document.        │   │ 每条 rule 每个颜色    │   │ 等价暗色 CSS         │
│ styleSheets +    │   │ 属性 → modifyColor    │   │ (!important) 覆盖回   │
│ 内联 style 扫描   │   │ (Rust/WASM 批变换)    │   │ + 背景图亮度分析     │
└──────────────────┘   └─────────────────────┘   └──────────────────────┘
        ↑ MutationObserver：新增 <style>/<link>/节点/内联样式 → 实时补色
```

RFC 023 采样管线**退为回退**：stylesheet 拿不到/跨域/解析失败时退回单色 Static 色，不裸奔（DR 无回退，失败即原样）。

### 3.1 接入缝（Strangler Fig）—— 与现有 `applyForcedDark` 的关系

迁移用 **Strangler Fig**（Fowler）：新引擎在旧采样路径**旁**生长，逐步绞杀，旧路径降级为回退，不一次性替换。

现有 dispatch（`apps/chrome/src/content/index.ts` `applyForcedDark` runPaint）四分支：`paintFilterPlusPath` / `paintFilterCssPath` / `paintStaticPath` / Dynamic 内联。

接入点（**决策树写死，无「或」歧义**）：

```
THEME_MODE_DYNAMIC 分支:
  if (!wasmAvailable())            → paintSampledFallbackPath()   # 旧采样单色(RFC 023)
  else:
    readable = collectReadableStyleSheets()   # 跳过跨域 SecurityError 的 sheet
    if (readable.length === 0)     → paintSampledFallbackPath()   # 整页无可读样式
    else:
      try   paintRecolorPath(readable, themeFilters, pagePalette) # 新引擎(§2/§3/§5)
      catch                        → paintSampledFallbackPath()   # 异常兜底
```

- `paintSampledFallbackPath` = 现有 Dynamic 采样单色逻辑抽函数（**非 `paintStaticPath`**；二者区分见下）。回退到「采样代表色」，非固定 Static 色。
- 选 `paintSampledFallbackPath` 而非 `paintStaticPath` 做回退：用户显式选 Dynamic，回退仍应尽量贴当前页（采样），而非跳到固定纸面色。`paintStaticPath` 仅 `THEME_MODE_STATIC` 用。
- **部分跨域**（部分 sheet 可读、部分不可读）：可读的走 `paintRecolorPath`，不可读 sheet 的规则覆盖不到 → 那部分元素**保持站点原色**（不为单个 sheet 触发整页回退）。已知局限，列 §4.1 P1-6 同档。
- 新增 `paintRecolorPath`，**与现有三个 paint* 同形**（消除 RFC 029 §0 「Dynamic 内联破坏对称」坏味）。
- Filter/Filter+/Static 分支**不动**。回退路径 = 现有代码抽函数，零删除 → never break userspace。

### 3.2 CSS 变量是地基决策，非 Phase 2（Fowler）

DR issue #2583 未解，因为这是**架构分叉**，不是细节：引擎看到的是**原始声明值**（`color: var(--x)`）还是**计算值**（`getComputedStyle` 解析后的实际色）？

- **静态重写**（读 `cssRules` 原始文本）：拿到 `var(--x)`，无法在 CSS 文本里改一个未知变量 → 这就是 #2583 卡点。
- **计算值路径**（按元素读 `getComputedStyle().color`）：拿到解析后真实 RGB，可改，但失去「改一条规则覆盖一片」的批量优势，退化成逐元素。

**本仓库定调**：Phase 1 = 静态重写为主（批量、快），CSS 变量**显式列已知限制**（与 DR 同档，P1-6）；**计算值路径作为 §6 待评估的 Phase 1.5**，不混入 Phase 1 主干。该决策写死于此，因它定引擎骨架，不可推迟到 Phase 2。

### 3.3 `modify-css` 层规格（规则遍历的边界）

`modify-css` = §3 管线 ② 的 stylesheet 重写层（区别于 §2 单色变换）。处理范围与待办边界：

| CSSRule 类型 | Phase 1 处理 |
|--------------|-------------|
| `CSSStyleRule`（普通规则） | ✅ 遍历 `.style` 颜色属性（§2.6 清单）→ `modifyColor` |
| `CSSMediaRule` / `CSSSupportsRule` | ✅ **递归**进 `.cssRules` 改内层（嵌套规则必须递归，否则 `@media` 内样式漏改） |
| `CSSImportRule` | ⚠️ `@import` 子表：同源递归其 `.styleSheet.cssRules`；跨域 → 走 §3.1 部分跨域局限 |
| `CSSKeyframesRule` | ✅ 递归 keyframe 内颜色（动画背景/色渐变） |
| `CSSFontFaceRule` / `CSSPageRule` | ⛔ 无颜色语义，跳过 |
| 原生 CSS 嵌套（`& .x {}`，新语法） | ✅ 同 `CSSStyleRule` 递归子规则 |

**输出策略**：不**原地改** `cssRules`（污染站点、与站点 JS 冲突）；改为**收集 (selector, 改后声明) → 生成新覆盖 stylesheet 注入**（`!important`），原样式表只读不写。

**待办边界（Phase 1 不做，列已知限制）**：

| 项 | 状态 | 归属 |
|----|------|------|
| Shadow DOM（`shadowRoot.adoptedStyleSheets` / 内部 `<style>`） | ⛔ Phase 1 不穿透 | 未来 RFC（DR 用 `adopted-style-manager`，本仓库另开） |
| 跨域 iframe 子文档 | ⛔ 不可注入（同 RFC 013 限制） | 永久限制 |
| `CSSStyleSheet.insertRule` 运行时新增 | ⚠️ 由 §3 MutationObserver + sheet 监听覆盖（P1-4） | Phase 1 P1-4 |
| 计算值变量解析（`var()`） | ⛔ 已知限制 | §3.2 Phase 1.5 |

---

## 4. Phase 1 — Parity（对齐 Dark Reader）

目标：`dark` 调色板下 Dynamic 观感不弱于 DR Dynamic。

### 4.0 Walking Skeleton（Kent：最小可跑骨架，先于 P1-1..P1-6）

逐步放大，每步一个绿测试，**走通再加宽**。不许 6 项并起。

| 步 | 范围 | 绿测试 | 出口 | 状态 |
|----|------|--------|------|------|
| S0 | `modifyColor(1 色)` | §2 算法结构断言 + §2.7 golden（`modify-color-golden.json` → WASM） | 颜色函数对 | ✅ **完成 2026-06-06** |
| S1 | 1 个元素 1 条 `color` | `<p style="color:#000">` → fg 暗色 | 单规则改写通 | ✅ **完成** |
| S2 | 1 张 `<style>` 全规则 | golden CSS 文件 in→out 快照 | stylesheet 重写通 | ✅ **完成** |
| S3 | 整页所有 `styleSheets` + 注入覆盖 | fixture 页观感对 | P1-1 达成 | ✅ **完成** |

**S0 落地**（2026-06-06，2026-06-07 改色下沉 Rust）：改色真源 = **Rust/WASM** `dark-engine::modifyColor` / `batchModifyColor`（算法 `dark-color-utils`）。`packages/shared/src/modify-colors.ts` 仅留**类型 + HSL 工具 + 默认 profile**，`modifyColor()` 直调 WASM。§2.7 golden 向量已回填（`modify-color-golden.json` + Rust `golden_vectors_rfc_027`）。

S0→S3 是骨架；P1-3（内联）、P1-4（MutationObserver）、P1-5（背景图）在骨架绿后并行加。

### 4.0.1 Rust/WASM 是引擎真源 —— TS 仅 DOM 胶水（不接受 TS 算颜色）

**铁律**：**所有颜色 / 像素 / 解析计算在 Rust/WASM。TS 只做 DOM 读写与编排。** 不在 TS 重写一份算法做「oracle」长期维护——那是双份代码、双份漂移。

| 层 | 语言 | 职责 |
|----|------|------|
| 颜色变换 `modifyColor`/`batchModifyColor` | **Rust** | §2 全部曲线，单色 + 批 |
| CSS 颜色 token 解析 | **Rust** ✅ | `parseCssColorTokenWasm`（`#hex`/`rgb()`/`hsl()`/named → RGB） |
| 背景图亮度 | **Rust** ✅ | `analyzeBackgroundImageRgba`（`ImageData` 字节 → 亮/暗/透明判定） |
| 去重缓存 | **Rust** ✅ | `batch_modify_color` 内 `HashMap` 同色只算一次 |
| stylesheet 遍历 / 内联扫描 / 注入 / MutationObserver | TS | 纯 DOM 编排，**不含颜色数学** |

**TS 里允许的颜色代码仅限**：`rgbToHsl`/`hslToRgb`/`scale` 等**纯工具**，供测试断言与文档示例；**产线改色一律走 WASM**（`modify-colors.ts` 现状如此）。

**golden 测试**：直接测 **WASM 输出**（§2.7 向量 → `modifyColor` WASM → 断言），不测 TS 影子实现。Rust 单测（`dark-color-utils`）+ WASM 集成测双层。

**性能立场**：见 §5——Rust 批处理是**对 TS 的速度碾压点**，不是可选优化。这是本模式存在的理由之一。

### 4.1 Phase 1 项（骨架绿后）

| 项 | 内容 | 验收 |
|----|------|------|
| P1-1 逐规则改色 | `modify-css`：遍历 `styleSheets` 每条 rule 颜色属性 → `modifyColor` | golden CSS 输入→输出快照（=S3） | ✅ |
| P1-2 颜色变换 | §2 全部曲线/常量/色相特判（**Rust/WASM**） | §2.7 golden 向量直测 WASM 输出 + `dark-color-utils` 单测 | ✅ |
| P1-3 内联样式 | 扫 `element.style` 颜色 | fixture 内联样式被改 | ✅ |
| P1-4 动态补色 | MutationObserver 新增节点/样式实时改色 | 动态插入 fixture | ✅ |
| P1-5 背景图 | 背景图亮度分析（**Rust/WASM**）+ 必要时 `filter: brightness()` | 暗/亮图 fixture | ✅ |
| P1-6 CSS 变量 | 静态重写下 `var(--x)` 不可改 → `recolor-known-limitations.ts` 列**已知限制** | 文档 + 测试 | ✅ |

---

## 5. Rust/WASM 引擎层（贯穿 Phase 1–2，非可选优化）

热点搬 Rust **不是 Phase 2 才考虑的反超手段，是引擎从第一版就成立的地基**（§1.1 铁律）。`modifyColor` 已在 Phase 1 落地 WASM；其余热点按下表推进。

### 5.1 Rust 交付物（按落地序，逐个证了再下一个）

| 模块 | 状态 | Rust 实现 | 速度优于 TS 的原因 |
|------|------|-----------|--------------------|
| **`modifyColor` 单色** | ✅ 已落地 | `dark-engine::modifyColor`（§2 曲线） | 无 GC，sRGB↔HSL 整数循环 |
| **`batchModifyColor` 批** | ✅ 已落地 | `dark-engine::batchModifyColor`（扁平 RGB + uses → 扁平 RGB） | **一次过桥算整页**，免 N 次 JS↔WASM 往返与 N 次 GC |
| CSS 颜色 token 解析 | ✅ 已落地 | `dark-color-utils::parse_css_color` + `parseCssColorTokenWasm` | 解析在热路径，Rust 无字符串 GC 抖动 |
| **背景图亮度** | ✅ 已落地 | `dark-color-utils::analyze_background_image` + `dark-engine::analyzeBackgroundImageRgba` | 大图像素级循环在 Rust；TS 仅 canvas `getImageData` I/O |
| 去重缓存 | ✅ 已落地 | `batch_modify_color` HashMap `(r,g,b,use)` 键 | 页色高度重复，缓存命中省整段计算 |

> 砍「一次一个」仍守（Linus）：上表**逐行落地**，非一锅端。但归属全在**本 RFC**（都是同一引擎的热点层），不再外推到 032。modifyColor 单色+批已完成两行。

### 5.1.1 颜色模型抽象（Fowler：DR 值是默认 profile，非合约） — ✅ Phase 1

不把 DR 常量焊死进引擎。定义本仓库**颜色模型接口**：

```
ColorProfile = {
  id, maxBgLightness, minFgLightness, poleBg, poleFg
}
```

`modifyColor(color, useTag, profileTag)`（WASM 第 5 参 `profile_tag`）。**DR 值 = 内置 `PROFILE_TAG_DARK` 默认 profile**（§2.1/2.2）；**`solarized-dark` 调色板 = `PROFILE_TAG_SOLARIZED_DARK`**（pole base03/base1）。`recolor-profile.ts` 映射 `PagePalette` → profile；`paintRecolorPath` / MO / 内联 style 全链路透传。

### 5.2 设计约束（写代码前定）

1. **批边界**：JS 收集「颜色 + 用途标签(bg/fg/border)」扁平数组 → 单次 WASM → 扁平结果（RFC 005 `batch_*` 形状）。禁逐色过桥。
2. **零拷贝倾向**：`Uint8Array`/`Uint32Array` 直传 WASM 线性内存，同形回读。
3. **纯函数**：Rust 改色算子无副作用、可单测（`dark-color-utils` 单测 + WASM 集成测）。
4. **回退不依赖 Rust**：WASM 加载失败 → RFC 023 采样单色（§3.1 决策树）。Rust 是引擎，回退保证不裸奔。

### 5.3 性能：批为默认，基准量化领先幅度

整页改色**一律走 `batchModifyColor`**（一次过桥），**禁止**在循环里逐次调单色 `modifyColor`（那才会被过桥成本吃掉）。单色 API 仅供测试/零散调用。

「Rust 批比 DR 的 TS 逐色快多少」需**基准量化**（典型重站：首屏改色总耗时、主线程阻塞 ms、ΔE 正确性同时记录）。基准用于**对外宣称领先幅度**与回归守门，不是「是否用 Rust」的开关——用 Rust 已定（§1.1）。

**回归测试**（2026-06-07）：`modify-colors-perf.test.ts` — 500 色重复页，`batchModifyColors` 须快于逐色 loop；批去重输出与标量一致。Golden 校准脚本：`packages/shared/scripts/calibrate-modify-color-golden.mjs`（Rust 真源 ↔ JSON fixture ↔ WASM）。

---

## 6. 写代码前待批准（blockers）

**已决（不再开放）**：
- pole 取值 → §2.1（`dark`/`solarized-dark` 调色板，本仓库默认 profile）。
- CSS 变量 → §3.2（Phase 1 静态重写 + 已知限制；计算值路径 = Phase 1.5）。
- modifyColor 语言 → §4.0.1（**Rust/WASM 真源，TS 仅 DOM 胶水**；TS 写颜色算法 = 反模式禁止）。

**已决（2026-06-06，本轮拍板）**：

1. **CSS 收集策略 → `cssRules` + 回退**。Phase 1 只遍历 `document.styleSheets[].cssRules`；同源 `<link>`/`<style>` 可读，**跨域 `<link>` 抛 `SecurityError` → 该表退 §3 采样单色回退**（非整页放弃，仅该 sheet）。fetch+解析（DR `network.ts`，需 host 权限）= **另开 RFC**，不进 Phase 1。理由：最轻、无新权限评审、先证核心。
2. **性能预算 → 复用 RFC 006 idle 预算 + rAF 合并**。首屏：同步注入**已可读 sheet** 的改写（保证不闪原色）；其余 + MutationObserver 补色走 `requestIdleCallback`/rAF 合并，**沿用 RFC 006 预算墙语义**（节点/时间上限），不新增第二套预算。超预算 → 余下 idle 续跑，不退 Static（与采样路径回退区分）。
3. **golden 校准时机 → S0 实现时做**，不阻塞批准。理由：校准需跑 live DR 读 computed，属实现工作；§2.7 表先作「待校准预期」驱动红测试，S0 跑校准脚本回填真值。
4. **Rust/WASM 即引擎 → 确认**（§1.1 / §4.0.1）。所有颜色/像素/解析热点在 Rust；TS 只碰 DOM。TS 写颜色算法 = 反模式，禁止。整页改色走 `batchModifyColor`（一次过桥）。

> 全部 blocker 已决 → 本 RFC 满足转 **Approved** 条件（待用户批准）。Approved 后方可写码（RFC 模式：零自动执行）。

---

## 7. Non-goals

- 不改 Filter/Filter+（已对齐 DR）。
- 不承诺 Canvas/WebGL 内容语义改色。
- Phase 1 不追求超越 DR；超越属 Phase 2 且需基准。

---

## 8. Risks

| 风险 | 缓解 |
|------|------|
| §2 常量随 DR 主分支漂移 | 本节标注核对日期；实现前重核 |
| WASM 过桥成本吃掉 Rust 收益 | §5.3 基准门槛，未过不宣称 |
| 跨域 stylesheet 拿不到 | RFC 023 采样单色回退 |
| 上万规则首屏卡 | §6 已定：复用 RFC 006 idle 预算 + rAF 合并，首屏只同步改写可读 sheet，余下 idle 续跑 |

---

## 9. Decision log

- 2026-06-06：立项 **T-044**，从 RFC 029 §0.1–0.5 拆出（Linus review：一文一职，029 只判旧路径到顶，本 RFC 定新引擎）。
- 2026-06-06：§2 常量**核对真源** `modify-colors.ts`：`MAX_BG_LIGHTNESS=0.4`、`MIN_FG_LIGHTNESS=0.55`、pole=主题底/字色、黄相 60-120→60-105 / 120-180→135-180 + `lx*=0.75`、蓝相前景 205-245→205-220、中性 `L<0.2||S<0.24`（修正旧 §0.1 误写 `S<0.12`）、border `[0,1]→[0.5,0.2]` 反向。
- 2026-06-06：§0.3 旧开放问题「Rust/TS」判为已决 → Rust 主力。§5.3 性能列为**假设 + 基准门槛**，非既定结论。
- 2026-06-06：**三审（Linus + Kent + Martin）落地**：
  - Linus：§5 砍到**单一 Rust 交付物**（modifyColor），余 3 项各独立 RFC；§2.6 阴影 bg 曲线**补语义理由**（阴影=背景延伸）；pole §2.1 拍板不再开放。
  - Kent：新增 §2.7 **golden 向量**（红测试，ΔE≤3，待 live DR 校准）+ §4.0 **walking skeleton** S0→S3 + §4.0.1 **Rust/WASM 真源**（2026-06-07 推翻旧 TS-first 叙事）。
  - Martin：§3.1 命名 **Strangler Fig** + 定 `paintRecolorPath` 接入缝（与现有 paint* 同形，顺修 Dynamic 内联坏味）；§3.2 **CSS 变量提为地基决策**（静态重写 vs 计算值路径）；§5.1.1 **ColorProfile 抽象**（DR 值=默认 profile，非合约，抗漂移）。
  - §6 blockers 减为 3 开放项（CSS 收集策略 / 性能预算 / golden 校准时机），其余标已决。
- 2026-06-06：**全部 blocker 拍板**（§6）：CSS 收集 = `cssRules`+回退（fetch 另开 RFC）；性能 = 复用 RFC 006 idle 预算 + rAF 合并（首屏同步可读 sheet）；golden 校准 = S0 实现时回填；Rust/WASM 即引擎确认（§4.0.1）。
- 2026-06-06：状态 **Approved**（用户批准，写 S0）。
- 2026-06-07：**Rust 即引擎，强化定调**。§1.1 新增铁律「所有热点跑 Rust/WASM，TS 只碰 DOM」；§4.0.1 **推翻旧 TS-first→port 叙事**，改为 Rust 真源 + TS 仅 DOM 胶水（TS 写颜色算法列为反模式禁止）；§5 从「Phase 2 反超」改为「贯穿 Phase 1–2 的引擎地基」，`modifyColor` 单色 + `batchModifyColor` 批标 ✅ 已落地（`dark-engine`）；§5.3 批为默认、禁循环逐色调，基准用于量化领先幅度非「是否用 Rust」开关。代码现状：`modify-colors.ts` 仅留类型/HSL 工具，改色直调 WASM。
- 2026-06-07：**P1-5 背景图亮度下沉 Rust**。`dark-color-utils::analyze_background_image` + `dark-engine::analyzeBackgroundImageRgba`；TS 仅 canvas I/O。
- 2026-06-07：**P1-6 CSS 变量已知限制 + §5.3 批改色**。`recolor-known-limitations.ts` 列 Phase 1 限制表；`var()` 跳过并测试。整表 `buildRecolorOverrideStylesheet` 走 `batchModifyColors` 单次 WASM（禁逐色过桥）。
- 2026-06-07：**Phase 1 收尾**。§5.3 性能回归测 + golden 校准脚本；P1-1/P1-2 标 ✅；§5.1 全表 ✅。
- 2026-06-06：**文档缺口修补**：§3.1 回退改为**写死决策树**（`paintSampledFallbackPath`，非 `paintStaticPath`；部分跨域局限明确）；§3.3 新增 **`modify-css` 层规格**（嵌套规则递归 `@media`/`@import`/keyframes/CSS nesting、覆盖式注入不原地改、Shadow DOM/跨域 iframe 列待办边界）；§8 风险「上万规则」与 §6 已决对齐；029 §3 用户口径更新为新引擎语义、§0 失效「§4.2」引用修正。
- 2026-06-07：**§5.1.1 ColorProfile 全链路**。Rust `profile_for_tag` + WASM `profile_tag` 参；TS `recolor-profile.ts`（dark / solarized-dark）；`paintRecolorPath`、MO、`buildRecolorInjection` 透传 profile。
- 2026-06-07：**Phase 1 完成 → Completed**。S0–S3、P1-1–P1-6、§2.7 golden、§5.1 全表、§5.3 基准；归档至 `docs/rfc/completed/`。

---

## 10. References（核对来源）

- Dark Reader `modify-colors.ts` 源码：<https://github.com/darkreader/darkreader/blob/main/src/inject/dynamic-theme/modify-colors.ts>
- `dynamic-theme` 模块：<https://github.com/darkreader/darkreader/tree/main/src/inject/dynamic-theme>
- 算法分析（二手，仅佐证）：<https://deepwiki.com/darkreader/darkreader/3.3-color-modification>
- CSS 变量限制 issue #2583：<https://github.com/darkreader/darkreader/issues/2583>
