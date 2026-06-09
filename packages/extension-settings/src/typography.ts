/**
 * RFC 018：全局字体替换与文本描边；可与 RFC 016 单站部分覆盖合并。
 */

import { ROOT_ATTR } from './constants'
import { CD_TEXT_LIKE_SELECTORS } from './style-selectors'

/** 与 `STORAGE_KEY_TYPOGRAPHY` 顶层 JSON 对齐。 */
export const TYPOGRAPHY_SCHEMA_VERSION = 1 as const

/** 预设字体栈键（不含 custom 时的字面量）。 */
export const TYPOGRAPHY_FONT_PRESET_SYSTEM = 'system' as const
export const TYPOGRAPHY_FONT_PRESET_SANS = 'sans' as const
export const TYPOGRAPHY_FONT_PRESET_SERIF = 'serif' as const
export const TYPOGRAPHY_FONT_PRESET_MONO = 'mono' as const
export const TYPOGRAPHY_FONT_PRESET_CUSTOM = 'custom' as const

export type TypographyFontPreset =
  | typeof TYPOGRAPHY_FONT_PRESET_SYSTEM
  | typeof TYPOGRAPHY_FONT_PRESET_SANS
  | typeof TYPOGRAPHY_FONT_PRESET_SERIF
  | typeof TYPOGRAPHY_FONT_PRESET_MONO
  | typeof TYPOGRAPHY_FONT_PRESET_CUSTOM

/** 可序列化字段（无 `v`），供合并与单站 partial。 */
export interface TypographySettingsV1 {
  /** 是否注入 `font-family`（关则完全不写字体规则）。 */
  fontEnabled: boolean
  fontPreset: TypographyFontPreset
  /** `fontPreset === custom` 时参与栈；其余模式忽略。 */
  customFontFamily: string
  textStrokeEnabled: boolean
  /** 非负；上限见 `clampTypographyStrokeWidthPx`。 */
  textStrokeWidthPx: number
}

export interface TypographyStateV1 extends TypographySettingsV1 {
  v: typeof TYPOGRAPHY_SCHEMA_VERSION
}

export const TYPOGRAPHY_MAX_CUSTOM_FONT_LEN = 200 as const

const FONT_STACK_SYSTEM =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' as const
const FONT_STACK_SANS = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' as const
const FONT_STACK_SERIF = 'Georgia, "Times New Roman", Times, serif' as const
const FONT_STACK_MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' as const

/** 默认：关闭字体与描边，避免破坏站点默认排版。 */
export const DEFAULT_TYPOGRAPHY_SETTINGS: TypographySettingsV1 = {
  fontEnabled: false,
  fontPreset: TYPOGRAPHY_FONT_PRESET_SYSTEM,
  customFontFamily: '',
  textStrokeEnabled: false,
  textStrokeWidthPx: 0.06,
}

export const DEFAULT_TYPOGRAPHY_STATE: TypographyStateV1 = {
  v: TYPOGRAPHY_SCHEMA_VERSION,
  ...DEFAULT_TYPOGRAPHY_SETTINGS,
}

/**
 * 去除可注入 CSS 的非法片段，避免 `font-family` 被截断或注入额外规则。
 */
export function sanitizeCustomFontFamily(raw: string): string {
  const s = raw
    .replace(/[\r\n\u0000]/g, ' ')
    .replace(/[;{}<>]/g, '')
    .replace(/\/\*/g, '')
    .trim()
    .slice(0, TYPOGRAPHY_MAX_CUSTOM_FONT_LEN)
  return s
}

export function parseFontPreset(raw: unknown): TypographyFontPreset | undefined {
  if (raw === TYPOGRAPHY_FONT_PRESET_SYSTEM) return TYPOGRAPHY_FONT_PRESET_SYSTEM
  if (raw === TYPOGRAPHY_FONT_PRESET_SANS) return TYPOGRAPHY_FONT_PRESET_SANS
  if (raw === TYPOGRAPHY_FONT_PRESET_SERIF) return TYPOGRAPHY_FONT_PRESET_SERIF
  if (raw === TYPOGRAPHY_FONT_PRESET_MONO) return TYPOGRAPHY_FONT_PRESET_MONO
  if (raw === TYPOGRAPHY_FONT_PRESET_CUSTOM) return TYPOGRAPHY_FONT_PRESET_CUSTOM
  return undefined
}

/** 将描边宽度限制在可读且不过度加粗的区间。 */
export function clampTypographyStrokeWidthPx(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_TYPOGRAPHY_SETTINGS.textStrokeWidthPx
  return Math.min(0.6, Math.max(0, n))
}

/** 归一化单条设置对象。 */
export function clampTypographySettings(t: TypographySettingsV1): TypographySettingsV1 {
  const preset = parseFontPreset(t.fontPreset) ?? DEFAULT_TYPOGRAPHY_SETTINGS.fontPreset
  return {
    fontEnabled: Boolean(t.fontEnabled),
    fontPreset: preset,
    customFontFamily: sanitizeCustomFontFamily(
      typeof t.customFontFamily === 'string' ? t.customFontFamily : '',
    ),
    textStrokeEnabled: Boolean(t.textStrokeEnabled),
    textStrokeWidthPx: clampTypographyStrokeWidthPx(t.textStrokeWidthPx),
  }
}

export function parseTypographyState(raw: unknown): TypographyStateV1 {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TYPOGRAPHY_STATE }
  const o = raw as Record<string, unknown>
  if (o.v !== TYPOGRAPHY_SCHEMA_VERSION) return { ...DEFAULT_TYPOGRAPHY_STATE }
  const base = parseTypographySettingsPartial(o)
  return {
    v: TYPOGRAPHY_SCHEMA_VERSION,
    ...clampTypographySettings({ ...DEFAULT_TYPOGRAPHY_SETTINGS, ...base }),
  }
}

function parseTypographySettingsPartial(o: Record<string, unknown>): Partial<TypographySettingsV1> {
  const out: Partial<TypographySettingsV1> = {}
  if (typeof o.fontEnabled === 'boolean') out.fontEnabled = o.fontEnabled
  const p = parseFontPreset(o.fontPreset)
  if (p !== undefined) out.fontPreset = p
  if (typeof o.customFontFamily === 'string') out.customFontFamily = o.customFontFamily
  if (typeof o.textStrokeEnabled === 'boolean') out.textStrokeEnabled = o.textStrokeEnabled
  if (typeof o.textStrokeWidthPx === 'number' && Number.isFinite(o.textStrokeWidthPx)) {
    out.textStrokeWidthPx = o.textStrokeWidthPx
  }
  return out
}

/** 自 storage 解析 `Partial`（用于单站覆盖）。 */
export function parseTypographyPartial(raw: unknown): Partial<TypographySettingsV1> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const partial = parseTypographySettingsPartial(o)
  const keys = Object.keys(partial) as (keyof TypographySettingsV1)[]
  if (keys.length === 0) return undefined
  return partial
}

export function typographyStateToSettings(s: TypographyStateV1): TypographySettingsV1 {
  const { v: _v, ...rest } = s
  return clampTypographySettings(rest as TypographySettingsV1)
}

/** 供 UI 与 CSS 使用的 `font-family` 栈字符串。 */
export function resolveFontFamilyCss(t: TypographySettingsV1): string {
  const c = clampTypographySettings(t)
  switch (c.fontPreset) {
    case TYPOGRAPHY_FONT_PRESET_SYSTEM:
      return FONT_STACK_SYSTEM
    case TYPOGRAPHY_FONT_PRESET_SANS:
      return FONT_STACK_SANS
    case TYPOGRAPHY_FONT_PRESET_SERIF:
      return FONT_STACK_SERIF
    case TYPOGRAPHY_FONT_PRESET_MONO:
      return FONT_STACK_MONO
    case TYPOGRAPHY_FONT_PRESET_CUSTOM: {
      const s = sanitizeCustomFontFamily(c.customFontFamily)
      return s.length > 0 ? `${s}, ${FONT_STACK_SANS}` : FONT_STACK_SANS
    }
    default:
      return FONT_STACK_SYSTEM
  }
}

/** 与全局比较，仅保留差异项（用于写入单站覆盖）。 */
export function diffPartialTypography(
  global: TypographySettingsV1,
  current: TypographySettingsV1,
): Partial<TypographySettingsV1> {
  const g = clampTypographySettings(global)
  const c = clampTypographySettings(current)
  const out: Partial<TypographySettingsV1> = {}
  if (c.fontEnabled !== g.fontEnabled) out.fontEnabled = c.fontEnabled
  if (c.fontPreset !== g.fontPreset) out.fontPreset = c.fontPreset
  if (c.customFontFamily !== g.customFontFamily) out.customFontFamily = c.customFontFamily
  if (c.textStrokeEnabled !== g.textStrokeEnabled) out.textStrokeEnabled = c.textStrokeEnabled
  if (c.textStrokeWidthPx !== g.textStrokeWidthPx) out.textStrokeWidthPx = c.textStrokeWidthPx
  return out
}

/** 是否需注入第二条样式（字体或描边任一开启）。 */
export function isTypographyInjectionActive(t: TypographySettingsV1): boolean {
  const c = clampTypographySettings(t)
  if (c.fontEnabled) return true
  if (c.textStrokeEnabled && c.textStrokeWidthPx > 0) return true
  return false
}

/**
 * RFC 018：在 `html[ROOT_ATTR]` 下注入字体（body）与描边（文本类节点）；空串表示不注入。
 */
export function buildTypographyCss(t: TypographySettingsV1): string {
  const c = clampTypographySettings(t)
  if (!isTypographyInjectionActive(c)) return ''

  const parts: string[] = []
  if (c.fontEnabled) {
    const fam = resolveFontFamilyCss(c)
    parts.push(`
    html[${ROOT_ATTR}] body {
      font-family: ${fam} !important;
    }`)
  }
  if (c.textStrokeEnabled && c.textStrokeWidthPx > 0) {
    const w = c.textStrokeWidthPx.toFixed(3)
    parts.push(`
    html[${ROOT_ATTR}] ${CD_TEXT_LIKE_SELECTORS} {
      -webkit-text-stroke: ${w}px rgba(255, 255, 255, 0.12) !important;
    }`)
  }
  return parts.join('\n')
}
