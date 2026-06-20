# RFC 022 — Popup / Options：Solarized Dark 界面配色（T-034）

| 字段 | 值 |
|------|-----|
| 状态 | Approved |
| 任务 ID | **T-034** |
| 创建日期 | 2026-03-29 |

依赖：[007](./007-popup-options-minimal-ui.md)（Popup / Options 最小 UI）

## Summary

将 **`action` popup** 与 **`options_ui`（同页、新标签）** 的界面配色统一为 **Solarized Dark**（Ethan Schoonover 定义的 16 色中的深色基色与强调色），替代当前自定义灰蓝调色板。用户在 **系统深色模式**（`prefers-color-scheme: dark`）下打开扩展界面时，同样使用本套 **Solarized Dark**（不另做一套「非 Solarized」的暗色主题），以满足「深色模式也选 Solarized Dark」的产品表述。

**参考（规范出处，非代码依赖）：** [Solarized](https://ethanschoonover.com/solarized/) — 本文仅采用其 **十六进制常量** 映射到现有 CSS 变量，不引入第三方运行时。

## Goals

1. `apps/chrome/src/popup/popup.css` 中 `--cd-popup-*` 变量映射到 Solarized Dark：`base03` / `base02` 作背景层级，`base1` / `base01` 作正文与弱化文字，`blue`（`#268bd2`）作主强调，`cyan`（`#2aa198`）作焦点环等与无障碍相关的强调。
2. 保留 `color-scheme: dark`，与浏览器在深色模式下的原生控件着色一致。
3. 文档化映射表（见下 **Implementation**），便于后续微调或引入 Solarized Light 变体时对照。

## Non-goals

1. **不**改变内容脚本对网页的强制暗色配色（Dynamic/Static/WASM 路径）；与本 RFC 正交。
2. **不**在首版为 `apps/site` 落地页强制换肤；若品牌统一需要，可另开短篇 RFC 或作为本 RFC 的后续迭代。
3. **不**新增用户可切换的「主题名」存储键；首版固定 Solarized Dark 单一路径。

## Risks

| 风险 | 缓解 |
|------|------|
| 个别控件对比度略低于 WCAG AAA | 以 `base1` on `base03` / `blue` 焦点环为主；必要时在实现审查中微调 alpha |
| 与旧截图/文档色差 | 更新 RFC 007 相关截图说明为「Solarized Dark」 |

## Testing

- 手工：在 macOS / Windows 将系统切换为 **深色模式**，打开 popup 与 options 标签页，确认背景、卡片、链接色、焦点环与 Solarized 一致。
- 回归：`pnpm --filter @change-dark/chrome lint`；无新增 Vitest 要求（纯 CSS）。

## Implementation（落地）

| Solarized 角色 | 十六进制 | 映射到 |
|----------------|----------|--------|
| base03 | `#002b36` | `--cd-popup-bg` |
| base02 | `#073642` | `--cd-popup-bg-elevated` |
| base01 | `#586e75` | `--cd-popup-muted`、边框混色 |
| base1 | `#93a1a1` | `--cd-popup-fg` |
| blue | `#268bd2` | `--cd-popup-accent` 及渐变/描边混色 |
| cyan | `#2aa198` | `--cd-popup-focus` |

| 项 | 说明 |
|----|------|
| 文件 | `apps/chrome/src/popup/popup.css`：`:root` 变量与原先依赖硬编码 `rgba(126,182,255,…)` 的按钮/策略选中态，改为与 `blue` 一致的 RGBA |
| 系统深色模式 | 不增加 `@media (prefers-color-scheme: light)` 的浅色分支；popup **始终** Solarized Dark，与「深色模式也使用 Solarized Dark」一致 |

## Decision log

- 2026-03-29：新增 RFC 022（T-034），Approved；落地为固定 Solarized Dark 单一路径。
