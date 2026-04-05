# Chrome 网上应用店 — 发布操作指南（嫦娥 Selena）

**政策、素材规格、权限英文稿、隐私 URL** 等与后台表单一一对齐的内容见 [**chrome-web-store-listing.md**](./chrome-web-store-listing.md)。本文只讲 **账号 → 后台操作 → 更新版本 →（可选）API 自动化**。

官方面向： [Chrome Web Store Developer Program](https://developer.chrome.com/docs/webstore) 、[Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)、[Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)（以当前英文文档为准）。

---

## 1. 开发者账号

1. 使用 Google 账号登录 [Google Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)。
2. 若首次发布扩展，需 **注册开发者账号** 并支付 **一次性注册费**（以控制台显示为准；历史上多为小额美元费用）。
3. 账号须开启 [2-Step Verification](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)（Google 账号层面的两步验证）。

---

## 2. 本仓库：构建可上传的 ZIP

在 **monorepo 根目录**：

```bash
pnpm install
pnpm --filter @luban-ws/chrome run pack
```

含义：`vite build` 得到 `apps/chrome/dist/`，再打成 **`apps/chrome/change-dark-extension.zip`**（根目录内含 `manifest.json`，已在 `.gitignore`）。**不要**把仓库根目录或 `src/` 打成 ZIP 上传。

上传前用「加载已解压的扩展程序」指向 `apps/chrome/dist` 做一次 [smoke test](https://developer.chrome.com/docs/webstore/troubleshooting#does-not-work)。

`manifest` 的 `version` 来自 **`apps/chrome/package.json`** 的 **`version`** 字段；**每次提交商店的包，版本号必须高于商店当前线上版本**（遵循 Chrome 版本比较规则）。

---

## 3. 首次在后台创建商品

1. 打开 [Developer Dashboard](https://chrome.google.com/webstore/devconsole/) → **New Item**（或「新增项目」）。
2. **Upload**（上传）选择上一步生成的 **`change-dark-extension.zip`**。首次上传会分配 **扩展 ID**（`chrome://extensions` 里 Developer mode 下可见），请记下来；后续 **Publish API** 要用。
3. 按左侧 Tab 逐项填写（与 [listing 文档](./chrome-web-store-listing.md) 一致即可）：
   - **Store listing**：说明、截图、宣传图、类别等。
   - **Privacy practices**：Single purpose、远程代码、数据使用、**Privacy policy URL**（须与 `privacy.html` 一致且 HTTPS 可访问）。
   - **Distribution** 等区域/可见性选项。
4. 保存后点击 **Submit for review**（提交审核）。审核时间因队列而异，以邮件/控制台状态为准。

---

## 4. 发布更新（新版本）

1. 在 `apps/chrome/package.json` 中 **递增** `version`（例如 `0.1.0` → `0.1.1`）。
2. 再次执行：`pnpm --filter @luban-ws/chrome run pack`。
3. 在控制台打开该扩展 → **Package**（或「软件包」）→ 上传新的 ZIP → 如需可同时更新商店文案 → **Submit for review**。

若仅改商店文案、未改包体，按控制台提示保存/提交即可（仍以官方界面为准）。

---

## 5.（可选）用 Publish API 在 CI 里上传

适合已在团队内规范好密钥管理、希望 **tag 或 release 时自动上传 draft/package** 的场景。**不会替代**你在后台人工填写 listing / 隐私 / 提交审核（除非你们额外接入完整流程）。

官方说明：[Using the Chrome Web Store Publish API](https://developer.chrome.com/docs/webstore/using-api)。

典型步骤摘要：

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建项目，启用 **Chrome Web Store API**。
2. 配置 **OAuth 同意屏幕** 与 **OAuth 客户端**（桌面应用或按文档推荐类型），取得 **Client ID / Client Secret**。
3. 用 Google 提供的流程换取与 Chrome Web Store **扩展管理** 权限对应的 **refresh token**（许多团队用一次性脚本或 [google 文档中的 OAuth playground 流程](https://developer.chrome.com/docs/webstore/using-api) 完成）。
4. 在 CI（如 GitHub Actions）中保存私密信息，例如：
   - `GWS_CLIENT_ID`
   - `GWS_CLIENT_SECRET`
   - `GWS_REFRESH_TOKEN`
   - **扩展 ID**（Item ID）

社区常用 CLI：`chrome-webstore-upload`（npm）等；使用前请核对是否与当前 API 版本一致。本仓库 **默认不提交** 此类 workflow，避免误把令牌写入 git。

---

## 6. 发布前最小核对（与 listing 文档互补）

- [ ] `pnpm --filter @luban-ws/chrome run pack` 成功，ZIP 根目录为 `manifest.json`。
- [ ] `apps/chrome/package.json` 的 `version` 大于商店当前版本（如是更新）。
- [ ] 隐私政策 URL、首页 URL 与 `store-listing-meta` / 后台一致且可访问。
- [ ] 截图、图标尺寸与 [listing §5](./chrome-web-store-listing.md) 一致。

更多条目见 [chrome-web-store-listing.md §9](./chrome-web-store-listing.md#9-上架前自检清单摘要)。
