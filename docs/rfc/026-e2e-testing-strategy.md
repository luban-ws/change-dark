# RFC 026 — 嫦娥 (Selena) E2E 自动化测试方案

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | T-039 |
| 创建日期 | 2026-04-06 |

## 1. 目标

解决手动测试繁琐、核心逻辑（暗检测、注入、持久化）容易回退的问题。

- **验证内容脚本**：在真实网页（及 Shadow DOM 页面）中验证 `data-change-dark-root` 与样式的正确性。
- **验证 Popup 交互**：测试全模式切换、阈值滑块、站点覆盖等 UI 逻辑对存储及页面的实时影响。
- **验证持久化**：重开页面或重启扩展后，用户偏好依然生效。

---

## 2. 技术选型：Playwright

**原因**：
- **原生支持扩展**：支持 launchPersistentContext，可指定 `--load-extension`。
- **跨上下文支持**：可同时操作内容脚本（普通页面）与 Popup（`chrome-extension://` 页面）。
- **稳定性高**：内置等待机制（Auto-waiting），减少 Flaky Tests。

---

## 3. 测试架构与目录

建议在 `apps/chrome` 下建立 `e2e` 目录：

```bash
apps/chrome/
  ├─ e2e/
  │   ├─ fixtures.ts       # 扩展加载逻辑，动态获取 extensionId
  │   ├─ injection.spec.ts # 核心注入逻辑测试
  │   └─ popup.spec.ts     # UI 交互与设置同步测试
  └─ playwright.config.ts  # E2E 配置（指定测试根目录、构建产物路径）
```

---

## 4. 核心用例计划

### 基线功能 (Injection)
1. **注入检测**：打开 `https://example.com`，断言 `<html>` 是否带有 `data-change-dark-root`。
2. **Auto 检测避让**：访问一个原生黑色页面，断言**不**注入强制暗色。
3. **阈值响应**：修改 Auto 阈值，验证原本注入的页面是否因为阈值调低而退出注入。

### Popup 交互 (UI synced with Engine)
1. **模式切换**：改为 `Filter` 模式，验证页面样式链变为 `invert(1)`。
2. **站点名单**：在 Popup 中切换“仅该站”，验证其他域名不生效。
3. **清除覆盖**：点击 compact 清除按钮，验证配置回归全局设置。

---

## 5. 实现步骤

1. **依赖安装**：在 `apps/chrome` 安装 `@playwright/test`。
2. **初始化配置**：编写 `playwright.config.ts`，配置启动参数（需要指定 `apps/chrome/dist` 为加载路径）。
3. **编写 Fixture**：
    ```typescript
    // e2e/fixtures.ts 伪代码
    export const test = base.extend({
      context: async ({ browserName }, use) => {
        const extensionPath = path.join(__dirname, '../dist');
        const context = await chromium.launchPersistentContext('', {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        });
        await use(context);
        await context.close();
      },
      extensionId: async ({ context }, use) => {
        let [background] = context.serviceWorkers();
        if (!background) background = await context.waitForEvent('serviceworker');
        const extensionId = background.url().split('/')[2];
        await use(extensionId);
      },
    });
    ```
4. **接入流水线**：在 root `package.json` 增加 `pnpm run test:e2e`。

---

## 6. 后续规划 (Non-goals in v1)
- 跨浏览器（Firefox）E2E 测试（Firefox 对 MV3 扩展加载 API 略有不同）。
- UI 视觉对比（Snapshot）测试。
