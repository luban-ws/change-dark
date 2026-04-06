# 嫦娥（Selena）WASM 暗色引擎设计文档

> **文档定位**：面向维护者的技术参考，描述 `packages/dark-engine` 与 `packages/dark-color-utils` 的功能边界、算法设计与数据流。生产行为以源代码为准。

---

## 1. 为什么用 Rust + WASM

| 原因 | 说明 |
|------|------|
| **性能** | k-means 聚类与逐像素亮度计算在 JS 中会占用主线程；WASM 允许高效的批量数值计算 |
| **确定性** | Rust 的整数/浮点行为明确，便于断言回归测试 |
| **隔离性** | 颜色计算逻辑集中在独立 crate，不污染扩展宿主代码 |

---

## 2. 包结构

```
packages/
├── dark-color-utils/     # 纯 Rust 库（no_std 友好）
│   └── src/lib.rs        # 所有颜色算法实现
└── dark-engine/          # WASM 宿主（wasm-bindgen）
    └── src/lib.rs        # 导出给 JS 的接口
```

`dark-color-utils` **不依赖** `wasm-bindgen`，可独立做 Rust 单测。  
`dark-engine` 薄封装后通过 `wasm-bindgen` 导出，供 TypeScript 调用。

---

## 3. 导出的 WASM API（`dark-engine/src/lib.rs`）

| JS 函数名 | Rust 函数 | 说明 |
|-----------|-----------|------|
| `luminanceU8(r,g,b)` | `luminance_u8` | 返回单像素 WCAG 相对亮度（0..1） |
| `mixTowardBlack(r,g,b,amount)` | `mix_toward_black` | 向黑色线性插值，返回 `[r,g,b]` |
| `suggestedForegroundForDarkBg(r,g,b)` | `suggested_foreground_for_dark_bg` | 深色背景前景色建议，返回 `[r,g,b]` |
| `batchRelativeLuminance(rgb)` | `batch_relative_luminance` | 扁平 RGB 缓冲 → 每像素亮度数组 |
| `batchMixTowardBlack(rgb, amount)` | `batch_mix_toward_black` | 批量向黑色混合，返回同形状缓冲 |
| `kMeansRgbCentroids(rgb, k, maxIter)` | `k_means_rgb_centroids` | RGB 欧氏 k-means，返回 `[r,g,b]*k` |
| `kMeansDarkerCentroid(rgb, maxIter)` | `k_means_darker_centroid` | **主算法**（见第 4 节），返回 3 字节 |

**输入格式（扁平 RGB 缓冲）**：每连续 3 字节为一个 `(R, G, B)` 像素，与 RFC 005/006 采样缓冲布局一致。最大 `3 * 524_288` 字节（约 1.5 MiB）。

---

## 4. 核心算法：`kMeansDarkerCentroid`（Dynamic 模式专用）

**目标**：从采样的页面背景色缓冲中，找到「代表主内容区的较暗颜色」，避免浅色顶栏把整体 k=1 均值拉亮。

### 4.1 算法管线（三路候选 + 条件回退）

```
输入: 扁平 RGB 缓冲 (n 个像素)
        │
   ┌────┴─────────────────────────────┐
   │                                  │
   ▼                                  ▼
[路径 A] Lloyd k=2 (L轴)        [路径 B] Otsu 直方图分割
   │                                  │
取「亮度更低的簇」            取「阈值以下的暗侧均值」
   │      │                           │
 簇够大  簇过小                    (≥16像素才运行)
   │      │
 取暗簇  取最暗 35% 分位
分通道中位数 RGB
   │
   ▼
取 A、B 候选中「亮度更低」者 → candidate
        │
   candidate 亮度 > 0.22?
        │ Yes
        ▼
   与最暗 28% 分位比较，取更暗者
        │
        ▼
     最终 3 字节 RGB
```

### 4.2 路径 A：L 轴 Lloyd（`k_means_two_clusters_luminance_then_darker_rgb`）

1. 计算每个像素的 **WCAG 相对亮度 L**（使用准确的 sRGB 线性化）。
2. 以 `[L_min, L_max]` 初始化两个质心，在亮度轴上做 **一维 Lloyd k=2**。
3. 确定「较暗簇」后：
   - 若较暗簇像素数 ≥ `max(3, n/12)`：取暗簇所有像素的**分通道中位数** RGB（抗离群点）。
   - 若较暗簇像素数过少：改用最暗 **35%** 像素的 RGB 均值。

### 4.3 路径 B：Otsu 直方图分割（`otsu_darker_centroid_rgb`）

1. 将 L 量化到 0..255 直方图（步长规模与 Otsu 经典定义一致）。
2. 最大化类间方差，找到最优阈值 `t`（Otsu 法）。
3. 取阈值以下的暗侧像素做 RGB 均值。
4. 若像素数 < 16，**不运行**（样本不足直方图无意义）。

### 4.4 条件暗尾分位回退

若最终候选色的 WCAG 亮度仍 > **0.22**（经验值，对应深灰边界），再尝试用最暗 **28%** 像素的 RGB 均值覆盖（若该值更暗）。

### 4.5 边界情况

| 条件 | 处理方式 |
|------|---------|
| n = 0 | 返回 `None` |
| n = 1 | 直接返回该像素 |
| n = 2 | 取亮度较低的那个 |
| 全页亮度几乎相同（`L_max - L_min < 1e-9`） | 退化为全样本 RGB 均值 |
| 两个簇有一个为空 | 退化为全样本 RGB 均值 |

---

## 5. 辅助颜色函数

### 5.1 WCAG 相对亮度

```rust
// sRGB 通道线性化（gamma 解码）
fn channel_to_linear_u8(c: u8) -> f64 {
    let x = c as f64 / 255.0;
    if x <= 0.04045 { x / 12.92 }
    else { ((x + 0.055) / 1.055).powf(2.4) }
}

// WCAG 2.x 公式
fn relative_luminance(r, g, b) = 0.2126*L(R) + 0.7152*L(G) + 0.0722*L(B)
```

### 5.2 向黑色混合（`mix_toward_black`）

```
result = channel * (1 - amount)   // amount ∈ [0,1], 0=不变, 1=纯黑
```

用于 Dynamic 模式：将代表色进一步压暗后作为页面背景色（`MIX_TOWARD_BLACK_AMOUNT = 0.88`）。

### 5.3 深色背景前景色（`suggested_foreground_for_dark_bg`）

| 背景亮度 | 前景色 |
|---------|--------|
| > 0.55  | `(18, 18, 22)` 近黑（极亮背景用深色文字） |
| ≤ 0.55  | `(230, 230, 235)` 高亮白灰（深色背景用浅色文字） |

---

## 6. 与内容脚本的数据流

```
content/index.ts (applyForcedDark)
        │
        ├─ collectPageBackgroundRgbBuffer()   ← sampling.ts (JS, RFC 006)
        │  └─ elementsFromPoint + 文档树 DFS → 扁平 RGB Uint8Array
        │
        ├─ kMeansDarkerCentroid(buffer, 40)  ← dark-engine (WASM)
        │  └─ 返回 baseRgb [r,g,b] (3字节)
        │
        ├─ batch_mix_toward_black(baseRgb, 0.88)  ← WASM
        │  └─ 返回压暗后的背景色
        │
        ├─ suggested_foreground_for_dark_bg(...)  ← WASM
        │  └─ 返回前景色建议
        │
        └─ buildStaticDarkCss(pageBg, pageFg)  ← @luban-ws/shared (TS)
           └─ 注入 <style> 到页面
```

`Solarized Dark` 模式跳过 WASM 颜色计算，直接使用固定常量：
- `pageBg = "rgb(0, 43, 54)"` (base03)
- `pageFg = "rgb(147, 161, 161)"` (base1)

---

## 7. 关键常量

| 常量 | 值 | 说明 |
|------|----|------|
| `DARK_CLUSTER_MAX_LUM_FOR_QUANTILE_REFINE` | `0.22` | 候选色亮度高于此时触发暗分位回退 |
| `DARKEST_REFINE_FRAC` | `0.28` | 条件回退时取最暗 28% 像素 |
| `SMALL_CLUSTER_QUANTILE_FRAC` | `0.35` | 暗簇过小时替代分位宽度 |
| `MIN_DARK_CLUSTER_FRAC` | `1/12` | 暗簇最小比例阈值 |
| `OTSU_MIN_PIXELS` | `16` | 运行 Otsu 所需最少像素数 |
| `MIX_TOWARD_BLACK_AMOUNT` | `0.88` | 基色向黑压暗强度（content 脚本用） |
| `STATIC_FALLBACK_RGB` | `[248, 250, 252]` | WASM 失败时的回退基色 |
| `MAX_BATCH_RGB_BYTES` | `3 * 524_288` | WASM 单次输入上限（~1.5 MiB） |

---

## 8. 测试

Rust 单元测试覆盖主要路径（`packages/dark-color-utils/src/lib.rs`）：

| 测试 | 验证内容 |
|------|---------|
| `luminance_white_is_oneish` | 白色亮度 ≈ 1.0 |
| `k_means_darker_prefers_dark_blob` | 混合缓冲中返回暗簇代表色 |
| `k_means_darker_uses_luminance_axis_not_rgb_chroma` | 按亮度分簇而非色度（高饱和红 vs 蓝） |
| `k_means_darker_quantile_refines_when_cluster_mean_still_gray` | 灰色主区 + 零星黑边时分位回退生效 |
| `k_means_darker_median_resists_single_bright_outlier` | 暗簇中单颗离群亮点不拉高中位数 |
| `k_means_darker_near_uniform_luminance_returns_mean_rgb` | 全页亮度均匀时退化为均值 |

---

## 9. 相关 RFC

| RFC | 内容 |
|-----|------|
| [RFC 005](./rfc/completed/005-wasm-batch-color-api.md) | WASM API 形状与扁平缓冲约定 |
| [RFC 006](./rfc/completed/006-content-script-sampling-budget-fallback.md) | 采样预算、`collectPageBackgroundRgbBuffer` |
| [RFC 012](./rfc/completed/012-theme-mode-dynamic.md) | Dynamic 模式产品行为 |
| [RFC 023](./rfc/completed/023-dynamic-color-engine-pipeline.md) | 管线语义、备选方案讨论与决策记录 |
