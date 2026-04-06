# 嫦娥 (Selena) 开发与使用指南

本指南主要面向开发者，介绍如何加载、调试以及自定义扩展程序的名称。

## 1. 本地安装与开发流程

### 构建项目
在项目根目录下执行以下命令来构建所有模块（包括 WASM 引擎、扩展程序和落地页）：
```bash
pnpm install
pnpm run build
```

### 加载扩展程序
1. 打开 Chrome 浏览器，进入 **“扩展程序” (chrome://extensions)** 页面。
2. 开启右上角的 **“开发者模式”**。
3. 点击 **“加载已解压的扩展程序”**。
4. 选择目录 `apps/chrome/dist`。

---

## 2. 如何自定义扩展程序名称

### 核心原理
扩展程序的名称是国际化驱动的。其逻辑定义如下：

1. **配置入口**：在 [`apps/chrome/manifest.config.ts`](../../apps/chrome/manifest.config.ts) 中定义了：
   ```typescript
   name: '__MSG_extName__'
   ```
2. **逻辑含义**：这行代码告诉 Chrome：“去 `_locales` 文件夹里根据用户的浏览器语言设置，寻找名为 `extName` 的键对应的内容作为扩展的名字。”

### 修改步骤
如果你需要修改名称，请编辑以下 i18n 文件：
- **英文版**：[`apps/chrome/public/_locales/en/messages.json`](../../apps/chrome/public/_locales/en/messages.json)
- **中文版**：[`apps/chrome/public/_locales/zh_CN/messages.json`](../../apps/chrome/public/_locales/zh_CN/messages.json)

> **注意**：目前我已经帮你把这两个文件里的名字都改成 **`嫦娥 (Selena)`** 了。

---

## 3. 使改动生效

在你修改了代码（或 locale 语言包）后，必须执行以下两步：

1. **重新构建**：
   ```bash
   pnpm run build
   ```
2. **刷新扩展**：
   前往 `chrome://extensions` 页面，点击插件下方的 **“刷新 (Reload)”** 循环按钮。

---

## 4. 落地页开发
落地页位于 `apps/site`，是一个 React + Vite 项目。它通过 `i18next` 支持中英双语切换。所有产品卖点和功能说明都应保持与扩展程序的实际表现一致。
