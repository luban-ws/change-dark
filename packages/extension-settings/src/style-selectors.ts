/**
 * 注入样式共用的 DOM 选择器常量（RFC 015 / 018 / 031）。
 * 与 `injected-styles` / `dynamic-recolor` 共享，避免循环依赖。
 */

import { CD_SURFACE_LANDMARK_SELECTORS } from './surface-heuristics'

/** RFC 015 / 018：浅层文本类选择器（无裸 `*`）。 */
export const CD_TEXT_LIKE_SELECTORS =
  ':where(main, article, aside, section, nav, p, span, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, label, dd, dt, a, code, pre)' as const

/**
 * 常见块级/地标容器：同步 `--page-bg`。
 * 不含 section/nav/header/footer — 多为透明布局壳，强铺底会破坏层叠与背景图。
 */
export const CD_BLOCK_BACKGROUND_SELECTORS =
  ':where(main, [role="main"])' as const

/**
 * 主题壳层表面（RFC 032）：**禁止 :where()**，须高于 WASM 输出的 `html[root] .class` 改色规则。
 */
export const CD_THEME_SHELL_SURFACE_SELECTORS = [
  'body',
  'main',
  '[role="main"]',
  'header',
  '[role="banner"]',
  'footer',
  '[role="contentinfo"]',
  '[class*="gmp-page"]',
  '[class*="__text-box"]',
  '[class*="__bar"]',
].join(', ') as const

/** 顶栏导航链接 / 激活 tab（通用 BEM + `.h-is-active` 模式）。 */
export const CD_THEME_SHELL_HEADER_NAV_SELECTORS = [
  'header nav a[class*="__nav-li-link"]',
  'header nav [class*="__nav-li-link"]',
  'header nav [class*="__nav-li"]',
].join(', ') as const

export const CD_THEME_SHELL_HEADER_NAV_ACTIVE_SELECTORS = [
  'header nav a[class*="__nav-li-link"].h-is-active',
  'header nav [class*="__nav-li-link"].h-is-active',
  'header nav [class*="__nav-li"].h-is-active',
].join(', ') as const

/**
 * Tailwind / Kumo 等 `light-dark()` 表面 utility（`bg-*-base`）。
 * 当 :root 变量改写因跨域 sheet 未命中时的兜底；仅铺 background-color。
 */
export const CD_THEME_SHELL_NEUTRAL_SURFACE_UTILITY_SELECTORS = [
  '[class*="bg-kumo-base"]',
  '[class*="bg-"][class*="-base"]',
].join(', ') as const

/** Tailwind / Kumo ring、border、hairline utility（Cloudflare 登录卡片等）。 */
export const CD_THEME_SHELL_NEUTRAL_LINE_UTILITY_SELECTORS = [
  '[class*="ring-kumo"]',
  '[class*="ring-neutral"]',
  '[class*="border-kumo"]',
  '[class*="border-neutral"]',
  '[class*="ring-kumo-line"]',
  '[class*="ring-kumo-hairline"]',
].join(', ') as const

/**
 * 站点 CSS 中常见的不透明浅底组件（仅 recolor 难以及时的壳层；勿用 `[class*="h-c-"]` 等宽匹配）。
 * @deprecated 铺底 CSS 已停用；保留供文档与 inline allowlist 对齐。
 */
export const CD_LAYOUT_SURFACE_SELECTORS = `:where(
  [class*="gmp-page"],
  [class*="__text-box"],
  [class*="__bar"]
)` as const

/** Dynamic：不改动像素型媒体（照片/视频/canvas）。 */
export const CD_MEDIA_ELEMENT_SELECTORS =
  ':where(img, picture, video, canvas, object, embed, iframe, [role="img"])' as const

/** @deprecated 使用 `CD_SURFACE_LANDMARK_SELECTORS` + `surface-heuristics`；保留兼容测试。 */
export const CD_OPAQUE_LIGHT_SURFACE_SELECTORS = CD_SURFACE_LANDMARK_SELECTORS
