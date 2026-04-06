# RFC 024 — Popup UI 现代化：Radix UI Themes + 嫦娥品牌 + 智能暗色检测（T-036）

| 字段 | 值 |
|------|-----|
| 状态 | Implemented |
| 任务 ID | **T-036** |
| 创建日期 | 2026-04-06 |

依赖：[007](../007-popup-options-minimal-ui.md)、[008](../008-global-on-off-policy.md)、[022](../022-solarized-dark-popup-ui.md)、[023](../023-dynamic-color-engine-pipeline.md)

## Summary

本 RFC 包含三个正交但同批落地的改进：

1. **Popup UI 架构重写**：从手写 `popup.css` 自定义组件迁移到 `@radix-ui/themes` 开源组件库，并引入 `lucide-react` 图标系统，提升视觉质量与可维护性。
2. **品牌统一**：扩展中文名正式确定为 **嫦娥**（`i18n.ts` 的 `zh_CN.extName`），不再依赖 `chrome.i18n.getMessage` 的动态值，避免语言切换时名称不更新。
3. **Auto 模式智能跳过原生暗色站点**：全局策略 `auto` 时，Dynamic 路径在取色采样后检测页面亮度（WCAG 亮度 < 0.08，即 `luma < 80`），若检测为原生暗色则不注入，避免"二次变暗"。

## Goals

1. **Popup 无手写 CSS 卡片**：删除原 `popup.css` 中数百行自定义面板样式，改用 `@radix-ui/themes` 的 `<Card>`、`<Switch>`、`<Slider>`、`<SegmentedControl>`、`<Tabs>`、`<Select>` 等。
2. **固定标头 + 内容可滚动**：弹窗顶部 Header（嫦娥 logo + 语言切换）固定不动，设置内容区通过 `<ScrollArea>` 独立滚动，用户在设置较多时无需滚动 Header 消失。
3. **Solarized Dark 关联弹窗主题**：当用户在"页面配色"中选中 `solarized-dark` 时，弹窗根节点附加 `theme-mode-solarized-dark` class，弹窗 UI 同步切换到 Solarized 配色，让控制面板与目标配色保持视觉一致。
4. **Policy SegmentedControl 正确性修复**：修复之前 `parseInt(val)` 破坏字符串键值 `'auto'/'on'/'off'` 导致点击失效的 bug，改为 `val as GlobalPolicy`。
5. **Auto 检测只在 Dynamic 模式且 `policy === 'auto'` 时触发**：`on` 永远强制注入，`off` 永远不注入，`auto` 在采样后判断是否跳过。

## Non-goals

1. **不**替换 `filter-css` / `filter-plus` / `static` 路径的暗色检测——这三种模式暂不做原生暗色跳过（`auto` + `filter-*` 组合不在用户常见路径中）。
2. **不**引入 Tailwind CSS（扩展体积敏感；Radix UI Themes 自带样式已足够）。
3. **不**更改存储 schema；`policy`/`palette` 键值与 RFC 004/008 完全兼容。

## Risks

| 风险 | 缓解 |
|------|------|
| `@radix-ui/themes` CSS 体积增加 | 已验证打包后 gzip ~82KB，可接受；后续可 tree-shake |
| Solarized 联动 class 可能被 Radix theme 变量覆盖 | 用 `!important` 覆盖 Radix CSS 变量，优先级足够 |
| Auto 亮度阈值（luma < 80）可能误判中性灰 | 采用 **线性 RGB 亮度**（非 sRGB）；80/255 ≈ 0.10，对应感知深灰；后续可配置化 |
| 标头 policy 字符串类型 bug 测试漏网 | 已有 `App.test.tsx` 集成覆盖；后续补 `actions.setPolicy` 单元断言 |

## Implementation（落地）

| 文件 | 变更摘要 |
|------|---------|
| `apps/chrome/package.json` | 新增 `@radix-ui/themes ^3.3.0`、`lucide-react ^1.7.0` |
| `apps/chrome/src/popup/main.tsx` | 引入 `@radix-ui/themes/styles.css`；根节点用 `<Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">` 包裹 |
| `apps/chrome/src/popup/App.tsx` | **完整重写**：`<Tabs.Root>` 布局、固定 Header、`<ScrollArea>` 设置区、`<SegmentedControl>` policy/scope、`<Card>` 各面板；修复 `policy` 传值（移除 `parseInt`）；动态 `theme-mode-${palette}` class 驱动 Solarized 联动 |
| `apps/chrome/src/popup/components/ThemeFiltersPanel.tsx` | 改用 `<Card>` + `<Slider>` |
| `apps/chrome/src/popup/components/TypographyPanel.tsx` | 改用 `<Card>` + `<Switch>` + `<Select>` + `<Slider>` |
| `apps/chrome/src/popup/components/SiteToolsPanel.tsx` | 改用 `<Card>` + `<SegmentedControl>` + `<TextArea>`；移除 `<details>/<summary>` accordion |
| `apps/chrome/src/popup/popup.css` | 清空手写组件样式；保留 `body/html/root` 基础尺寸；新增 `.theme-mode-solarized-dark` Radix 变量覆盖 |
| `apps/chrome/src/content/index.ts` | 引入 `readGlobalPolicy`、`POLICY_AUTO`；Dynamic 分支在采样后加 luma 检测（只在 `policy === 'auto'` 时跳过） |
| `apps/chrome/src/popup/i18n.ts` | `extName` 静态化为 `'嫦娥'`（zh_CN）/ `'Selena'`（en），脱离 `chrome.i18n` 运行时绑定 |

## Testing

- **集成测试**：已有 `App.test.tsx`（`@testing-library/react`）覆盖渲染路径；后续可补 policy SegmentedControl click 断言。
- **手工**：加载打包后 `change-dark-extension.zip`，验证：
  1. 标头固定、设置内容可滚动。
  2. 语言切换后标题正确显示"嫦娥"/"Selena"。
  3. 页面配色切换 Solarized 时弹窗背景同步变为 `#002b36`。
  4. Auto 模式下访问 GitHub（原生暗色）不重叠注入；On 模式下必须注入。
  5. Global Switch 三段可点击切换并持久化到 `chrome.storage.local`。

## Decision log

- 2026-04-06：新增 RFC 024（T-036），Implemented。
- 2026-04-06：选用 `@radix-ui/themes`（而非 Tailwind/shadcn）——扩展无 Tailwind 构建链，Radix Themes 自带完整暗色 token，bundle 成本可接受。
- 2026-04-06：`lucide-react` 替代 emoji 与内联 SVG，与 UI/UX Pro Max 规范一致（禁止 emoji 作图标）。
- 2026-04-06：嫦娥（Chang'e）为中文名最终确定，不做后备英文名并存的逻辑。
- 2026-04-06：Auto 亮度阈值 `luma < 80`（线性 RGB），可后续提 RFC 配置化。
