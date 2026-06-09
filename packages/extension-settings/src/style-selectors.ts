/**
 * 注入样式共用的 DOM 选择器常量（RFC 015 / 018 / 031）。
 * 与 `injected-styles` / `dynamic-recolor` 共享，避免循环依赖。
 */

/** RFC 015 / 018：浅层文本类选择器（无裸 `*`）。 */
export const CD_TEXT_LIKE_SELECTORS =
  ':where(main, article, aside, section, nav, p, span, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, label, dd, dt, a, code, pre)' as const

/** 常见块级/地标容器：同步 `--page-bg`，避免浅字叠白底。 */
export const CD_BLOCK_BACKGROUND_SELECTORS =
  ':where(main, article, aside, section, nav, header, footer, [role="main"])' as const

/** Dynamic：不改动像素型媒体（照片/视频/canvas）。 */
export const CD_MEDIA_ELEMENT_SELECTORS =
  ':where(img, picture, video, canvas, object, embed, iframe, [role="img"])' as const
