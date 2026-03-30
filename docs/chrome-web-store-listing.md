# Chrome 网上应用店 — 与官方要求逐项对齐（嫦娥 Change Dark）

下文对照 **现行** [开发者计划政策](https://developer.chrome.com/docs/webstore/program-policies/)、[上架准备](https://developer.chrome.com/docs/webstore/prepare)、[商品详情页](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)、[隐私权实践](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)、[图片规格](https://developer.chrome.com/docs/webstore/images)、[MV3 附加要求](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)、[疑难排解（权限）](https://developer.chrome.com/docs/webstore/troubleshooting#excessive_permissions)。依法合规以你方律师与最终提交内容为准。

---

## 1. 固定 URL（必须与 manifest / 落地页一致）

| 项目 | URL |
|------|-----|
| 项目站点（`homepage_url` / 主页） | https://luban-ws.github.io/change-dark/ |
| **隐私权政策（开发者后台「Privacy policy」框）** | https://luban-ws.github.io/change-dark/privacy.html |
| 源代码 | https://github.com/luban-ws/change-dark |
| **支持（Store listing → Support URL，建议）** | https://github.com/luban-ws/change-dark/issues |

隐私页须 **HTTPS 可访问**、正文为隐私政策（不可仅在商品说明里代替）。政策内容须说明 **收集/使用/披露** 及与后台「数据使用」勾选 **一致**（参见 [Listing requirements #3](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)）。

---

## 2. 清单（`manifest.json`）— [Prepare](https://developer.chrome.com/docs/webstore/prepare)

| 字段 | 要求 | 本项目 |
|------|------|--------|
| `name` | 有意义、不误导 | `嫦娥 Change Dark` |
| `version` | 每次上传必须大于上一版；建议早期可用小号版本 | `package.json` / manifest 同步 |
| `icons` | 含多尺寸；ZIP 内路径有效 | `icons/icon-16.png` … `icon-128.png` |
| `description` | **≤ 132 字符**（超出会导致无法解析等问题） | 见 `manifest.config.ts` 英文摘要 |
| 注释 | 上传的 JSON **不得含注释** | 由构建生成，无注释 |
| ZIP 根目录 | `manifest.json` 在 **ZIP 根**，不在子文件夹 | `pnpm --filter @luban-ws/chrome run pack` |

**图标 128×128（商店与清单）**：[官方建议](https://developer.chrome.com/docs/webstore/images#icon-size)方形主图形约 **96×96**，四周透明边距至 **128×128**。本项目由 `pnpm --filter @luban-ws/chrome run icons` 对 `icon-128.png` 自动生成该比例。

---

## 3. 权限 — 最小化（[Purple Potassium](https://developer.chrome.com/docs/webstore/troubleshooting#excessive_permissions)）

声明权限仅 **`storage`** + **`host_permissions`: `<all_urls>`**。

- **`tabs` / `activeTab` 已移除**：在已声明 **宽泛主机权限** 时，对 `chrome.tabs.query` 访问匹配标签页的 `url` 等等价数据通常 **不再需要** 另行声明 `tabs`（参见 [tabs API Host permissions](https://developer.chrome.com/docs/extensions/reference/api/tabs#permissions) 与疑难排解「Commonly misunderstood permissions」）。可减少「过度权限」拒审风险。

**后台「权限理由」申请表单**（逐项粘贴，英文）：

**`storage`**

> Stores the user’s extension settings locally in the browser (global policy, theme mode, filter sliders, site list, per-site overrides, typography, optional CSS). No account; settings are not synced to our servers for core functionality.

**`host_permissions` / `<all_urls>`**

> Injects a content script to apply user-configured forced-dark styling and related CSS on http(s) pages. Broad patterns are needed because users may visit any website. Host access also supports reading tab properties (such as the active tab URL) needed for the popup and shortcuts, consistent with Chrome’s host permission model.

---

## 4. 隐私权实践（Developer Dashboard → Privacy practices）

与 [官方说明](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)一致，通常包括：

### 4.1 Single purpose（单一用途）

与商店说明、popup 功能一致，示例（英文，可自行微调）：

> This extension’s single purpose is to apply a forced dark appearance (and related user-configured theme, filter, typography, and optional per-site CSS) on websites the user visits.

### 4.2 Remote code（远程代码）

> 选 **No**（否）。逻辑与 WASM 均在扩展包内；不适用动态远程执行 JS（符合 [MV3 要求](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)）。

说明框可写：

> No remotely hosted code is executed. WebAssembly and scripts are bundled in the extension package.

### 4.3 Data usage / certification（数据使用与认证）

须与 **`privacy.html`** 一致。本扩展在 **本地** 处理页面样式采样与选项，可能构成对 **网站内容/资源** 或 **与网页交互相关的信息** 的处理；请按 [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) 诚实勾选。

勾选后须在 **Limited use** 相关认证项中确认符合 [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use)（`privacy.html` 第 4 节已写披露文案）。**禁止** 在后台勾选与实际行为或隐私政策矛盾的选项。

### 4.4 Privacy policy URL

填：`https://luban-ws.github.io/change-dark/privacy.html`  
部署 Pages 后务必在无痕窗口打开验证 **200**、无混合内容错误。

---

## 5. 商品详情 / 素材 — [Images](https://developer.chrome.com/docs/webstore/images)、[Listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)

| 素材 | 规格 | 是否强制 |
|------|------|----------|
| **扩展图标（上传到商店）** | **128×128** PNG（可与包内 `icon-128.png` 相同） | 强制 |
| **截图** | **至少 1 张**；**1280×800**（首选）或 **640×400**；最多 5 张；方形、无内边距 | 强制 |
| **小型宣传图** | **440×280** PNG/JPEG | 强制 |
| **Marquee** | **1400×560** | 可选 |
| **YouTube 宣传视频** | 链接 | 可选（listing 文档曾提及；以当前控制台为准） |

截图须 **真实反映扩展 UI**（参见 [Yellow Zinc](https://developer.chrome.com/docs/webstore/troubleshooting#missing-or-insufficient-metadata)）。文字说明须与功能一致（[Deceptive behavior](https://developer.chrome.com/docs/webstore/troubleshooting#deceptive-behavior)）。

**类别**：可选 *Productivity* 或与无障碍/阅读相近之类别，以控制台列表为准。

**关键字**：避免 [Keyword spam](https://developer.chrome.com/docs/webstore/program-policies/spam-faq)。

---

## 6. 英文短描述与详述（备用粘贴）

**Short description（与 manifest `description` 一致，≤132 字符）**  
见构建产物 `apps/chrome/dist/manifest.json`（须 ≤132）。

**Detailed description（商品详情长文，可自行增删）**

> **Change Dark** (嫦娥) is a Manifest V3 extension for Chromium-based browsers. Its **single purpose** is to apply a **forced dark appearance** on websites you visit, with optional per-site rules, theme modes (including Dynamic sampling with WebAssembly), filters, typography, and optional site-specific CSS snippets.
>
> **Privacy**  
> Settings are stored locally using Chrome extension storage. The privacy policy URL explains how page-related data is processed for theming. If you use the optional support link (e.g. Buy Me a Coffee), you leave the extension UI and third-party sites apply.
>
> **Open source**  
> Source and RFC-backed specifications: GitHub repository **luban-ws/change-dark**.

---

## 7. 构建与 ZIP

**后台点「上传」之前的具体操作顺序（账号、首次创建商品、更新版本）见 [chrome-web-store-publish.md](./chrome-web-store-publish.md)。**

```bash
pnpm install
pnpm --filter @luban-ws/chrome run pack
```

生成 **`apps/chrome/change-dark-extension.zip`**（已 gitignore）。须含根级 `manifest.json`、`icons/`、`assets/` 等。勿将 `src/` 或 monorepo 根打入 ZIP。

上传前建议本地 **打包为 .crx 或仅用 ZIP 加载** 做 [smoke test](https://developer.chrome.com/docs/webstore/troubleshooting#does-not-work)。

---

## 8. 分发与其它标签页

- **Distribution**：按目标区域设置；默认多区域时遵守当地规则。
- **两步验证**：开发者账号需 [2-Step Verification](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)（Google 账号层面）。

---

## 9. 上架前自检清单（摘要）

- [ ] `privacy.html` 已部署且 URL 与后台 **完全一致**
- [ ] 后台「数据使用」与 **`privacy.html`、实际行为** 无矛盾
- [ ] `permissions` 已最小化；理由文案已填
- [ ] Remote code 选 **No**
- [ ] 截图尺寸 **1280×800 或 640×400**；小型宣传图 **440×280**；商店图标 **128×128**
- [ ] `manifest` 中 `description` **≤132** 字符
- [ ] ZIP 根目录即 `manifest.json`
- [ ] 可选：`LICENSE`（MIT）已在仓库 root，与扩展一同维护
