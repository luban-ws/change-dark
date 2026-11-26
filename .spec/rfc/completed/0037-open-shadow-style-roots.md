# RFC 0037: 开放 Shadow DOM 与 adoptedStyleSheets 动态改色

| 字段 | 值 |
|------|-----|
| 基线 | [0031](0031-dynamic-recolor-engine.md)、[0036](0036-css-variable-recolor-graph.md) |
| 上游对照 | Dark Reader dynamic-theme style managers |

**Status:** Implemented

## Summary

扩展 Dynamic 改色到可访问的开放 ShadowRoot。当前引擎只从 `document.styleSheets` 收集规则，并把覆盖层注入主文档；Shadow DOM 是独立样式树，因此组件内部规则既未被读取，也无法被主文档覆盖。增加按 root 管理的规则收集、覆盖注入与变更观察，并读取 root 的 `styleSheets` 和 `adoptedStyleSheets`。保留现有 Document 路径和跨域 stylesheet 的安全跳过行为。

## Problem

`collectReadableStylesheetCssTexts(doc)` 遍历 `Document.styleSheets`；`recolor-path.ts` 把收集结果送入现有改色管线，最后由 `applyRecolorInjectionFromBuild` 把一个 `<style>` 放进主文档。`recolor-observer.ts` 也只观察 `document.documentElement`。因此 ShadowRoot 内样式不进入 recolor source，主文档样式也不能穿过 shadow boundary 覆盖内部组件。

同一张 constructed `CSSStyleSheet` 可以被多个 root 共享，且规则变更会同步影响所有使用者。只在 document 首次读取 `adoptedStyleSheets` 会遗漏这种后续变化。Dark Reader 将 ShadowRoot 和 adopted stylesheet 纳入动态样式管理，并为它们单独创建/更新管理器；这说明此缺口属于样式 root 管理，不是 RFC 0036 的变量推断问题。

Gmail 和 Google Calendar 是用户报告的触发站点，但尚无页面级复现记录证明具体未改色节点来自 Shadow DOM。此 RFC 修复可复用的引擎缺口，不把站点症状未经验证地归因于某一种 DOM 实现，也不承诺完整站点兼容。

## Goals

1. 保持 Document 当前收集、注入和刷新语义不变。
2. 发现初次扫描时已存在的开放 ShadowRoot，以及页面运行中通过 `attachShadow({mode: 'open'})` 创建的 root；每个 root 只注册一次。
3. 从每个可访问 root 收集普通 `style` / `link` stylesheet、`ShadowRoot.styleSheets` 与 `adoptedStyleSheets` 的可读 CSS 规则；跨域或读取失败的单张 stylesheet 跳过，不中断其他 root。
4. 将改色覆盖样式注入到对应 ShadowRoot，保持样式隔离；销毁或关闭 Dynamic 时移除本扩展在各 root 中的覆盖层和观察器。
5. 合并 DOM/style 变化与 adopted stylesheet 的 CSSOM 变化；按 root 去重、批处理，并复用 RFC 0006 的 idle 预算，避免每次 mutation 都全页同步扫描。
6. 同一 constructed stylesheet 被多个 root 共享时，变更后更新所有已注册使用者。
7. 为普通 DOM、开放 ShadowRoot、共享 adopted sheet、动态插入 root、跨域失败、停用清理及重复通知建立可自动验证的测试。

## Non-goals

1. 闭合 ShadowRoot（`mode: 'closed'`）及浏览器不可访问的 root。
2. 跨域 stylesheet fetch、iframe 注入、浏览器权限范围扩张。
3. Gmail / Calendar 专用 CSS 规则或对两站完整兼容的承诺；站点例外仍走 RFC 0034，并须由页面证据支持。
4. CSS 变量依赖图；归 RFC 0036。
5. 通过定时器反复遍历整页发现 root；不得用无界轮询掩盖 root 生命周期观察缺口。
6. 无法在不改变页面语义的前提下观察到的 adoptedStyleSheets 数组原地变更。如果浏览器 API 限制阻止可靠捕获，需以测试证明并在验收报告中明确缩小支持面，不得静默声称覆盖。

## Design

### 方案比较

| 方案 | 原理 | 优点 | 风险 |
|------|------|------|------|
| 按 root 管理器 + 早期 root 通知（推荐） | isolated content script 负责读取/改写规则；document 初扫发现现存开放 root；`document_start` 的 MAIN-world 小型 hook 在 `attachShadow` 返回开放 root 后通知 isolated world；每个 root 维护独立 collector、observer 和注入节点 | 生命周期明确；覆盖运行期创建的 root；扫描与写入仍由扩展隔离世界拥有 | MAIN world 与页面共享，hook 可被页面覆盖/干扰；事件需校验 target、限频并只触发扩展内部工作；必须保持原生 `attachShadow` 参数、返回值和异常语义 |
| 仅 DOM observer + 周期重扫 | 观察主树变化并定时遍历所有可见 host | 不增加 MAIN-world hook | 无法可靠发现已连接 host 后创建的 ShadowRoot；全页重复遍历浪费 CPU；不满足性能要求，拒绝 |

推荐方案把 MAIN-world 部分压到一个无权限、无数据读取的通知 hook。它不决定主题、不读取 CSS、不执行改色；isolated world 接到通知后只读取 `event.target.shadowRoot`，确认其为开放 root 且尚未注册。若 hook 不可用，初始扫描及新增 host 扫描仍工作，但无法保证捕获已连接 host 上之后创建的 root；该降级必须可观测。

### 所有权与数据流

`Document` 与 `ShadowRoot` 是 `StyleRoot` 的两个变体。每个已注册 root 拥有一份 source sheet 集合、一个 root-scoped observer、一个待刷新标记和一个扩展注入节点。共享 `CSSStyleSheet` 由反向索引映射到多个 StyleRoot；CSSOM 变更只使相关 roots 失效，合并到下一帧并经 idle budget 重建。重复 root 通知通过 `WeakMap` 注册表自然成为 no-op。

```text
document_start: Document scan + open-root notification hook
  → register StyleRoot once
  → collect styleSheets + adoptedStyleSheets (read failures isolated per sheet)
  → existing recolor pipeline (RFC 0036 graph plugs in at its planned source transform)
  → inject override into that StyleRoot
  → observe root-local DOM and known CSSStyleSheet mutations
  → coalesce root invalidations → idle rebuild
  → stop: disconnect observers, restore sheet wrappers, remove root-owned injection
```

不改变作者 stylesheet，不替换作者的 adopted sheet，不覆盖页面自定义变量。扩展样式节点必须使用现有扩展 ID/标记规则，避免 MutationObserver 观察自身写入形成循环。每个 root 的颜色 shell 需要显式验证 selector 在 ShadowRoot 中的语义；不能假定 `:root`、`html` 或 `documentElement` 可直接复用。

### 实施任务

#### Task 1：统一 stylesheet root 收集

在 `packages/dynamic-recolor/src/stylesheet-collect.ts` 引入 `Document | ShadowRoot` 的 root 输入。Document 保留 `document.styleSheets` 既有顺序；ShadowRoot 收集 root 本地 `styleSheets` 与 `adoptedStyleSheets`，按 stylesheet 身份去重。单张 sheet 读取失败时继续处理其余 sheet。保持现有 `Document` 调用签名兼容，避免破坏当前调用方。

#### Task 2：root-scoped 注入与清理

在 `packages/dynamic-recolor/src/recolor-inject.ts` 增加针对 StyleRoot 构建/应用覆盖的窄接口。Document 继续调用现有路径；ShadowRoot 注入独立 `<style>`，不复用 document 的 style element。注入内容须由 root 上下文构建，清理只删除本扩展拥有的节点。

#### Task 3：root 生命周期与变更合并

在 `apps/chrome/src/content/` 添加 root registry/manager，扫描初始 document 和新增 host 子树；在 `apps/chrome/manifest.config.ts` 注册最小 MAIN-world `document_start` 通知脚本，捕捉页面创建的开放 root。现有 isolated content script 校验通知后注册 root。各 root 的 DOM observer 只监听相关子树；以 root 为单位做 rAF 合并和 idle rebuild。停止/禁用时拆除监听和对应覆盖层。

#### Task 4：adopted stylesheet 变更观察

对已注册 root 当前采用的 constructed sheets 建立共享反向索引。只包装支持且可恢复的 CSSOM 写方法（`insertRule`、`deleteRule`、`replace`、`replaceSync`）；保留原始 `this`、参数、返回值、异常和 Promise 行为。方法调用完成后仅标记采用该 sheet 的 roots 失效。wrapper 按引用计数安装，最后一个消费者移除时恢复原实现。`adoptedStyleSheets` 列表后续增删须有浏览器级验收；如无法无侵入捕获原地数组变化，则明确记录为限制，不能为它引入全局高频轮询。

#### Task 5：兼容与性能验收

在 `packages/dynamic-recolor` 单测 collector、失败隔离、去重和多 root 共享关系；在 Chrome E2E fixture 验证初始/运行期开放 root、root-local style、adopted sheet、CSSOM 更新、注入边界和停用清理。保留原 document fixture 回归。测量 root 数量增长时刷新范围，证明一个 root 的 mutation 不触发所有其他 root 的 CSS 重建。

## Acceptance

1. 既有 Document recolor fixture 和当前 stylesheet / inline 路径结果不变；现有 API 调用无需迁移。
2. 初始 HTML 中已存在的开放 ShadowRoot 内浅色 CSS，经注入后 computed style 变为当前主题色；注入节点只存在于对应 root。
3. 已连接 host 在运行期创建开放 ShadowRoot 后，通知到达且 root 在同一调度周期注册一次；重复通知不产生重复 observer 或 style node。
4. root 内插入/修改/删除 `style` 与 `link[rel~=stylesheet]` 后，只刷新该 root，且 MutationObserver 不因扩展自己的注入无限触发。
5. document 与两个 ShadowRoot 共享同一 constructed sheet 时，`insertRule` / `deleteRule` / `replace` / `replaceSync` 更新所有采用该 sheet 的已注册 roots，且每个刷新批次合并为一次。
6. 单张跨域或不可读 sheet 失败不会阻止其他 sheet/root 改色；页面原有异常和 API 返回值保持不变。
7. Dynamic 停用后清除 Document 与全部已注册 ShadowRoot 的扩展覆盖层；恢复所有仍被页面使用的 CSSStyleSheet 原方法；重复启停无残留。
8. 自动化 E2E 覆盖以上生命周期；测试命令及逐项结果写入实现交付记录。RFC 0036 的 CSS variable graph 可后续接入同一 source pipeline，但本 RFC 不等待或实现 036。
9. Gmail / Calendar 作为手动验证目标时，必须记录浏览器版本、URL、受影响元素所在 root 类型、source sheet 类型与 before/after computed style；无此证据不得宣称两站已修复。

### 上游参考

- Dark Reader [`dynamic-theme/index.ts`](https://github.com/darkreader/darkreader/blob/main/src/inject/dynamic-theme/index.ts)：现有 manager、ShadowRoot 生命周期与 adopted stylesheet refresh。
- Chrome [`content scripts`](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)：isolated world 与页面 world 分离；MAIN world 代码可被页面干扰，因此 hook 不处理权限或用户数据。
- MDN [`ShadowRoot.styleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/styleSheets) 与 [`adoptedStyleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets)：root-local stylesheet 与共享 constructed stylesheet 的行为。
