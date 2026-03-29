/**
 * 对网页强制暗色时的配色方案：通用深色（WASM）与 Solarized Dark 固定色。
 */

/** 与历史行为一致：采样 / 固定基色 + WASM 混合。 */
export const PAGE_PALETTE_DARK = 'dark' as const

/** Solarized base03 / base1，不依赖采样。 */
export const PAGE_PALETTE_SOLARIZED_DARK = 'solarized-dark' as const

export type PagePalette = typeof PAGE_PALETTE_DARK | typeof PAGE_PALETTE_SOLARIZED_DARK

export const DEFAULT_PAGE_PALETTE = PAGE_PALETTE_DARK

/** base03 */
export const SOLARIZED_PAGE_BG_CSS = 'rgb(0, 43, 54)' as const

/** base1 */
export const SOLARIZED_PAGE_FG_CSS = 'rgb(147, 161, 161)' as const

export function parsePagePalette(raw: unknown): PagePalette {
  if (raw === PAGE_PALETTE_SOLARIZED_DARK) return PAGE_PALETTE_SOLARIZED_DARK
  return DEFAULT_PAGE_PALETTE
}

export function parseOptionalPagePalette(raw: unknown): PagePalette | undefined {
  if (raw === undefined) return undefined
  if (raw === PAGE_PALETTE_SOLARIZED_DARK) return PAGE_PALETTE_SOLARIZED_DARK
  if (raw === PAGE_PALETTE_DARK) return PAGE_PALETTE_DARK
  return undefined
}
