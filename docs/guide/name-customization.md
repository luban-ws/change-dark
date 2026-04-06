# 如何自定义扩展程序名称

本指南详细介绍了如何修改 **嫦娥 (Selena)** 在浏览器扩展管理页 (chrome://extensions) 显示的名称及其背后的原理解析。

## 1. 原理解析

如果你查看 [`apps/chrome/manifest.config.ts`](../../apps/chrome/manifest.config.ts)，你会发现扩展程序的名称被定义为：

```typescript
// manifest.config.ts
export default (env: ConfigEnv): ManifestV3 => ({
  // ...
  name: '__MSG_extName__',
  // ...
});
```

**逻辑说明：**
`manifest.config.ts` 中定义了：`name: '__MSG_extName__'`。这行代码告诉 Chrome：“去 `_locales` 文件夹里根据用户的浏览器语言，寻找名为 `extName` 这个键对应的内容作为我的名字。”

## 2. 修改步骤

如果你想永久修改扩展程序的名称，请直接修改以下国际化语言包文件：

### 英文环境
修改 [`apps/chrome/public/_locales/en/messages.json`](../../apps/chrome/public/_locales/en/messages.json) 中的 `message` 字段：
```json
"extName": {
  "message": "嫦娥 (Selena)"
}
```

### 中文环境
修改 [`apps/chrome/public/_locales/zh_CN/messages.json`](../../apps/chrome/public/_locales/zh_CN/messages.json) 中的 `message` 字段：
```json
"extName": {
  "message": "嫦娥 (Selena)"
}
```

## 3. 使改动生效

修改完源文件后，你**必须**执行以下操作来更新已加载到浏览器的扩展程序：

1. **重新构建项目**：
   在根目录下运行以下命令来更新 `dist` 目录：
   ```bash
   pnpm run build
   ```

2. **在浏览器中刷新**：
   - 打开 Chrome 的 **扩展程序 (chrome://extensions)** 页面。
   - 找到 **嫦娥 (Selena)** 插件。
   - 点击插件框右下角的 **“刷新 (Reload)”** 循环图标按钮。

---

> **小贴士**：目前的预设值已经按照最新要求更新为 **`嫦娥 (Selena)`**。如有后续变更，请务必执行上述 Rebuild 与 Reload 流程。
