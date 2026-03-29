/**
 * RFC 011：全局主题滤镜（亮度 / 对比度 / 棕褐 / 饱和度）。
 * RFC 016 将在此结构上叠加 per-site；当前仅全局键。
 */

/** 与 `STORAGE_KEY_THEME_FILTERS` 对应的 JSON 形状（v1）。 */
export interface ThemeFiltersStateV1 {
  /** 百分比，100 为中性，范围见 `clampThemeFilters`。 */
  brightness: number
  contrast: number
  sepia: number
  /** 饱和度 %，100 为中性（等价于 CSS `saturate(100%)`）。 */
  saturate: number
}

export const DEFAULT_THEME_FILTERS: ThemeFiltersStateV1 = {
  brightness: 100,
  contrast: 100,
  sepia: 0,
  saturate: 100,
}

/** 与 Dark Reader 类行为接近的 filter 串联顺序：brightness → contrast → sepia → saturate。 */
export const THEME_FILTER_CHAIN_ORDER =
  'brightness → contrast → sepia → saturate' as const

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/**
 * 将任意输入规范到合法区间（存储回读 / 用户输入共用）。
 */
export function clampThemeFilters(p: Partial<ThemeFiltersStateV1>): ThemeFiltersStateV1 {
  const d = DEFAULT_THEME_FILTERS
  return {
    brightness: clamp(p.brightness ?? d.brightness, 10, 200),
    contrast: clamp(p.contrast ?? d.contrast, 10, 200),
    sepia: clamp(p.sepia ?? d.sepia, 0, 100),
    saturate: clamp(p.saturate ?? d.saturate, 0, 200),
  }
}

export function parseThemeFiltersState(raw: unknown): ThemeFiltersStateV1 {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_THEME_FILTERS }
  const o = raw as Record<string, unknown>
  return clampThemeFilters({
    brightness: typeof o.brightness === 'number' ? o.brightness : undefined,
    contrast: typeof o.contrast === 'number' ? o.contrast : undefined,
    sepia: typeof o.sepia === 'number' ? o.sepia : undefined,
    saturate: typeof o.saturate === 'number' ? o.saturate : undefined,
  })
}

export function isIdentityThemeFilters(p: ThemeFiltersStateV1): boolean {
  const d = DEFAULT_THEME_FILTERS
  return (
    p.brightness === d.brightness &&
    p.contrast === d.contrast &&
    p.sepia === d.sepia &&
    p.saturate === d.saturate
  )
}

/**
 * 生成 `html[ROOT_ATTR]` 可用的 `filter:` 值（不含 `filter:` 前缀）。
 */
export function buildThemeFilterValue(params: ThemeFiltersStateV1): string {
  const t = clampThemeFilters(params)
  return `brightness(${t.brightness}%) contrast(${t.contrast}%) sepia(${t.sepia}%) saturate(${t.saturate}%)`
}
