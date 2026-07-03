# Chrome 网上应用店 — 后台逐项填写指南（嫦娥 Selena）

本文是 **Developer Dashboard 实操手册**：按控制台左侧 Tab / 表单项顺序，说明 **填什么、贴哪里、用哪个文件**。政策与规格摘要见 [chrome-web-store-listing.md](./chrome-web-store-listing.md)；打包与上传流程见 [chrome-web-store-publish.md](./chrome-web-store-publish.md)。

**当前目标版本**：`apps/chrome/package.json` 中的 `version`（发布前请确认已高于商店线上版）。

---

## 文档与素材地图

| 用途 | 仓库路径 |
|------|----------|
| 短描述（manifest，≤132 字符） | `apps/chrome/src/store-listing-meta.ts` → `CWS_SHORT_DESCRIPTION` |
| 英文长描述（商店详情） | [docs/publish/webstore-description-en.txt](./publish/webstore-description-en.txt) |
| 中文长描述（可选第二语言） | [docs/publish/webstore-description-zh.txt](./publish/webstore-description-zh.txt) |
| 权限理由（英文） | [docs/publish/permission-justifications-en.txt](./publish/permission-justifications-en.txt) |
| 权限理由（中文参考） | [docs/publish/permission-justifications-zh.txt](./publish/permission-justifications-zh.txt) |
| 单一用途（英文） | [docs/publish/single-purpose-statement-en.txt](./publish/single-purpose-statement-en.txt) |
| 单一用途（中文参考） | [docs/publish/single-purpose-statement-zh.txt](./publish/single-purpose-statement-zh.txt) |
| 商店截图 1280×800 | `docs/publish/screenshot-en-1280x800.png`、`screenshot-zh-1280x800.png` |
| 小型宣传图 440×280 | `docs/publish/promo-tile-440x280.png` |
| Marquee（可选）1400×560 | `docs/publish/hero-tile-1400x560.png` |
| 商店图标 128×128 | 构建后：`apps/chrome/dist/icons/icon-128.png` |
| 可上传 ZIP | `apps/chrome/change-dark-extension.zip`（`pnpm --filter @change-dark/chrome run pack`） |
| 隐私政策落地页 | https://luban-ws.github.io/change-dark/privacy.html |

---

## 填写前准备（约 15 分钟）

1. **Google 账号** 已开启 [两步验证](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)。
2. 已登录 [Developer Dashboard](https://chrome.google.com/webstore/devconsole/)。
3. 本地已打包：
   ```bash
   pnpm install
   pnpm run build && pnpm run test
   pnpm --filter @change-dark/chrome run pack
   ```
4. 无痕窗口打开隐私 URL，确认 **HTTP 200**：  
   https://luban-ws.github.io/change-dark/privacy.html
5. 本地 smoke：`chrome://extensions` → 开发者模式 → **加载已解压的扩展程序** → 选 `apps/chrome/dist`。

---

## 一、Package（软件包）

| 步骤 | 操作 |
|------|------|
| 1 | 左侧 **Package** → **Upload new package** |
| 2 | 选择 `apps/chrome/change-dark-extension.zip` |
| 3 | 等待解析成功；确认显示的 **version** 与 `package.json` 一致 |
| 4 | 若有错误，常见原因：ZIP 根目录不是 `manifest.json`、版本号未递增 |

**注意**：每次提审新包，`version` 必须 **严格大于** 商店当前已发布版本。

---

## 二、Store listing（商品详情）

控制台字段名可能随 Google 更新略有变化；下表按常见英文界面描述。

### 2.1 基本信息

| 后台字段 | 填什么 | 复制来源 |
|----------|--------|----------|
| **Extension name** | `嫦娥 (Selena)` | 与 manifest `name` 一致（`_locales/en` → `extName`） |
| **Summary / Short description** | 见下方英文块（107 字符） | 须与 manifest `description` **完全一致** |
| **Description / Detailed description** | 英文长文 | [webstore-description-en.txt](./publish/webstore-description-en.txt) |
| **Category** | `Productivity`（或 *Accessibility*） | 以控制台下拉为准 |
| **Language** | 默认 **English**；可再添加 **Chinese (Simplified)** | 添加中文时，长描述用 `webstore-description-zh.txt` |

**Short description（直接粘贴，勿改字）：**

```
Force dark appearance on websites (MV3). Heavy color work runs in Rust/WebAssembly; global, per-site rules.
```

校验：字符数 ≤ 132（当前 107）。自动化测试：`apps/chrome/src/__tests__/store-listing-meta.test.ts`。

### 2.2 URL

| 后台字段 | 填什么 |
|----------|--------|
| **Homepage URL** | `https://luban-ws.github.io/change-dark/` |
| **Support URL**（若有） | `https://github.com/luban-ws/change-dark/issues` |

须与 `apps/chrome/src/store-listing-meta.ts` 中 `CWS_HOMEPAGE_URL` 及 manifest `homepage_url` 一致。

### 2.3 图片素材

| 后台字段 | 规格 | 上传文件 |
|----------|------|----------|
| **Store icon** | 128×128 PNG | `apps/chrome/dist/icons/icon-128.png` |
| **Screenshots** | 至少 1 张；推荐 **1280×800**；最多 5 张 | 建议顺序见下 |
| **Small promo tile** | **440×280** | `docs/publish/promo-tile-440x280.png` |
| **Marquee promo tile**（可选） | **1400×560** | `docs/publish/hero-tile-1400x560.png` |

**推荐截图顺序（最多 5 张）：**

1. `screenshot-en-1280x800.png` — 英文 Options / Popup UI（主图）
2. `screenshot-zh-1280x800.png` — 中文 UI
3. `screenshot-page-demo-1280x800.png` — 浅色页暗色效果（可选，展示实际改色）

重新生成截图：

```bash
pnpm --filter @change-dark/chrome run build
pnpm --filter @change-dark/chrome run test:e2e:install   # 首次
pnpm run screenshots:store
```

### 2.4 关键字与其它

- **不要**堆砌无关关键字（[Keyword spam 政策](https://developer.chrome.com/docs/webstore/program-policies/spam-faq)）。
- 截图必须来自 **当前 Dynamic-only** UI，勿出现已移除的 Filter/Static 模式界面。
- 商店文案须与扩展 **实际功能** 一致，避免 [Deceptive behavior](https://developer.chrome.com/docs/webstore/troubleshooting#deceptive-behavior) 拒审。

---

## 三、Privacy practices（隐私权实践）

与 [privacy.html](https://luban-ws.github.io/change-dark/privacy.html) **必须一致**。勾选前请通读隐私页 §2–§3。

### 3.1 Single purpose description

粘贴 [single-purpose-statement-en.txt](./publish/single-purpose-statement-en.txt) 正文，或精简版：

```
This extension's single purpose is to apply a forced dark appearance (Dynamic recolor with on-device WebAssembly, user-chosen palette, typography, and optional per-site CSS) on websites the user visits.
```

### 3.2 Remote code（远程代码）

| 选项 | 选择 |
|------|------|
| **Does your extension use remote code?** | **No** |

说明框（若出现）：

```
No remotely hosted code is executed. WebAssembly and scripts are bundled in the extension package.
```

### 3.3 Privacy policy URL

```
https://luban-ws.github.io/change-dark/privacy.html
```

### 3.4 Data usage（数据使用）

Google 表单会按数据类型逐项询问。请 **诚实勾选**，并与 `privacy.html` 对齐。本扩展行为摘要：

| 数据类型 | 是否涉及 | 说明（填表 / 认证时可用） |
|----------|----------|---------------------------|
| **Personally identifiable information** | 否 | 无账号、无收集姓名/邮箱等 |
| **Health information** | 否 | — |
| **Financial / payment information** | 否 | 可选 Buy Me a Coffee 链接会跳转到第三方，扩展本身不处理支付 |
| **Authentication information** | 否 | — |
| **Personal communications** | 否 | — |
| **Location** | 否 | — |
| **Web history** | 否 | 不向开发者服务器上传浏览历史 |
| **User activity** | 否* | 不向开发者服务器上传行为分析 |
| **Website content** | **是（本地处理）** | 在设备上读取页面样式/颜色以应用暗色；**不**上传到开发者服务器 |

\* 若控制台将「本地读取页面 DOM/样式」归类为 website content 或 user activity，勾选 **仅用于提供扩展功能**，并勾选 **Limited Use** 认证。

**Limited Use 认证**（提交前必读 [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)）：

- 数据仅用于用户可见的暗色功能
- 不出售给第三方
- 不用于广告定向或信用评估
- 无人为审阅用户浏览内容

### 3.5 Permission justifications（权限理由）

上传 ZIP 后，控制台可能对每个权限要求 **英文理由**。逐项粘贴：

**`storage`**

```
Stores the user's extension settings locally in the browser (global policy, Dynamic dark palette, site list, per-site overrides, typography, optional CSS). No account; settings are not synced to our servers for core functionality.
```

**`host_permissions` / `<all_urls>`**

```
Injects a content script to apply user-configured forced-dark styling and related CSS on http(s) pages. Broad patterns are needed because users may visit any website. Host access also supports reading tab properties (such as the active tab URL) needed for the popup and shortcuts, consistent with Chrome's host permission model.
```

完整版（含审核答辩要点）：[permission-justifications-en.txt](./publish/permission-justifications-en.txt)。

---

## 四、Distribution（分发）

| 字段 | 建议 |
|------|------|
| **Visibility** | Public（公开发布）或 Unlisted（仅链接可见，内测用） |
| **Regions** | 默认全球；若有合规顾虑再缩小区域 |
| **Pricing** | Free |

---

## 五、Account / 开发者账号

- 确认开发者账号已完成注册费（首次）与 **2-Step Verification**。
- 记录首次上传后的 **Extension ID**（Item ID），便于日后 Publish API。

---

## 六、提交审核

1. 左侧各 Tab 无红色必填警告。
2. 点击 **Submit for review**（或 **Publish** → 提交审核，以当前 UI 为准）。
3. 状态变为 **Pending review** 后，在 RFC 035 Decision log 或 PR 中记录日期与版本号。
4. 拒审时：保存邮件/控制台理由 → 对照 [疑难排解](https://developer.chrome.com/docs/webstore/troubleshooting) 修正 → bump patch → 重新 pack → 再提交。

---

## 七、首次上架 vs 更新版本

| 场景 | 额外步骤 |
|------|----------|
| **首次（New Item）** | 完整填写 Store listing + Privacy practices + Distribution；上传 ZIP 后获得 Extension ID |
| **更新（已有商品）** | Package 上传新 ZIP；若仅修文案可不改包；**version 必须递增** |
| **仅改商店文案** | Store listing 保存即可；是否需重新审核以控制台提示为准 |

---

## 八、提审前最终勾选清单

打印或复制到 PR 描述：

- [ ] `change-dark-extension.zip` 来自最新 `pnpm run pack`，`dist/manifest.json` 中 `version` 正确
- [ ] Short description 与 `CWS_SHORT_DESCRIPTION` 一致，≤132 字符
- [ ] 截图 / 宣传图尺寸正确，UI 为 Dynamic-only
- [ ] 隐私 URL 200；后台 URL 与 manifest / `store-listing-meta` 一致
- [ ] Remote code = **No**
- [ ] 数据使用勾选与 `privacy.html` 无矛盾
- [ ] `storage`、`<all_urls>` 理由已填
- [ ] 本地 smoke 至少 2 站通过
- [ ] `pnpm run test` 与 `pnpm --filter @change-dark/chrome run test:e2e` 已绿（发布门禁）

---

## 九、相关官方链接

- [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Fill out the listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Image guidelines](https://developer.chrome.com/docs/webstore/images)
- [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- [Permission troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting#excessive_permissions)
