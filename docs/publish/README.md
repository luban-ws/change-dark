# 嫦娥 (Selena) — Chrome 网上应用店素材包

本目录存放 **商店 listing 可粘贴文案** 与 **截图/宣传图**。后台怎么填、贴哪一栏，请看主指南：

**→ [chrome-web-store-dashboard-fill-guide.md](../chrome-web-store-dashboard-fill-guide.md)**（逐项填写手册）

配套文档：

| 文档 | 内容 |
|------|------|
| [chrome-web-store-dashboard-fill-guide.md](../chrome-web-store-dashboard-fill-guide.md) | Dashboard 每个 Tab/字段怎么填 |
| [chrome-web-store-listing.md](../chrome-web-store-listing.md) | 政策、规格、权限英文稿 |
| [chrome-web-store-publish.md](../chrome-web-store-publish.md) | 打包 ZIP、首次上架、更新版本 |

---

## 本目录文件一览

| 文件 | 用途 | 粘贴到后台 |
|------|------|------------|
| `webstore-description-en.txt` | 英文商品长描述 | Store listing → Description |
| `webstore-description-zh.txt` | 中文商品长描述 | 添加 zh_CN 语言时使用 |
| `single-purpose-statement-en.txt` | 单一用途（英文） | Privacy → Single purpose |
| `single-purpose-statement-zh.txt` | 单一用途（中文参考） | 内部校对用 |
| `permission-justifications-en.txt` | 权限理由（英文） | Privacy → Permission justification |
| `permission-justifications-zh.txt` | 权限理由（中文参考） | 内部校对用 |
| `screenshot-en-1280x800.png` | 英文 UI 截图 | Screenshots #1 |
| `screenshot-zh-1280x800.png` | 中文 UI 截图 | Screenshots #2 |
| `screenshot-page-demo-1280x800.png` | 页面暗色效果演示 | Screenshots #3（可选） |
| `promo-tile-440x280.png` | 小型宣传图 | Small promo tile |
| `hero-tile-1400x560.png` | Marquee 宣传图 | Marquee（可选） |

**短描述（≤132 字符）** 不在此目录，单一数据源：`apps/chrome/src/store-listing-meta.ts`。

**商店图标 128×128**：构建后 `apps/chrome/dist/icons/icon-128.png`。

---

## 重新生成截图

```bash
pnpm --filter @change-dark/chrome run build
pnpm --filter @change-dark/chrome run test:e2e:install   # 首次需安装 Chromium
pnpm run screenshots:store
```

仅 UI、不要页面演示：

```bash
pnpm --filter @change-dark/chrome run screenshots:store -- --ui-only
```

---

## 产品定位（宣贯摘要）

**嫦娥 (Selena)** 是 Manifest V3 **Dynamic-only** 强制暗色扩展：在设备上用 Rust/WebAssembly 分析并重写页面样式，支持全局/按站规则与可选 CSS，**不上传**浏览数据到开发者服务器。

详细价值主张见上文各 `webstore-description-*.txt`。
