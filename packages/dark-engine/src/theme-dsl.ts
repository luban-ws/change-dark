/**
 * RFC 0038：`.theme` DSL Rust WASM 编译器、校验器与格式化器薄封装。
 * 类型结构与 `@change-dark/site-catalog` 1:1 对齐，保持 `dark-engine` 零上游工作区依赖。
 */
import * as fallback from './js-fallback'
import { bg, isWasmAvailable } from './wasm-runtime'

export type ThemeDslColorUseKind = 'bg' | 'fg' | 'border'

export interface ThemeDslError {
  message: string
  line: number
  column: number
  offset: number
}

export type ThemeDslResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ThemeDslError }

export interface ThemeDslMatchV1 {
  hostEquals?: string[]
  hostSuffix?: string[]
  pathPrefix?: string[]
}

export interface ThemeDslGutterProbeV1 {
  mainSelector: string
  insetPx: number
}

export interface ThemeDslSurfaceRepairV1 {
  landmarkSelectors?: string[]
  componentClassHints?: string[]
  neverPaint?: string[]
  minPanelAreaPx?: number
  minPanelWidthPx?: number
  minPanelHeightPx?: number
  gutterProbe?: ThemeDslGutterProbeV1
}

export interface ThemeDslCssVarSubstituteV1 {
  use: ThemeDslColorUseKind
  fallback?: string
}

export interface ThemeDslRecolorV1 {
  forceShorthandProperties?: string[]
  cssVarSubstitute?: Record<string, ThemeDslCssVarSubstituteV1>
}

export interface ThemeDslSiteProfileV1 {
  v: 1
  id: string
  match: ThemeDslMatchV1
  priority?: number
  surfaceRepair?: ThemeDslSurfaceRepairV1
  recolor?: ThemeDslRecolorV1
  customCss?: string
}

export interface ThemeDslSiteProfilePatchV1 {
  disabled?: boolean
  surfaceRepair?: Partial<ThemeDslSurfaceRepairV1>
  recolor?: Partial<ThemeDslRecolorV1>
  customCss?: string
}

function parseEnvelope<T>(raw: string): ThemeDslResult<T> {
  return JSON.parse(raw) as ThemeDslResult<T>
}

/** 编译 `.theme` 站点档案源码（支持多条 `profile "..." { ... }`）。 */
export function compileThemeDsl(
  source: string,
): ThemeDslResult<ThemeDslSiteProfileV1[]> {
  return parseEnvelope<ThemeDslSiteProfileV1[]>(
    isWasmAvailable() ? bg.compileThemeDslWasm(source) : fallback.compileThemeDslWasm(source),
  )
}

/** 编译单条用户 `.theme` 站点补丁（`patch { ... }`）。 */
export function compileThemePatchDsl(
  source: string,
): ThemeDslResult<ThemeDslSiteProfilePatchV1> {
  return parseEnvelope<ThemeDslSiteProfilePatchV1>(
    isWasmAvailable()
      ? bg.compileThemePatchDslWasm(source)
      : fallback.compileThemePatchDslWasm(source),
  )
}

/** 在微任务边界异步编译 `.theme` 站点补丁，避免与当前 UI 事件帧争抢。 */
export function compileThemePatchDslAsync(
  source: string,
): Promise<ThemeDslResult<ThemeDslSiteProfilePatchV1>> {
  return Promise.resolve().then(() => compileThemePatchDsl(source))
}

/** 将 `SiteProfilePatchV1` 格式化为规范 `.theme` patch 源码。 */
export function formatThemePatchDsl(
  patch: ThemeDslSiteProfilePatchV1,
): ThemeDslResult<string> {
  const json = JSON.stringify(patch)
  return parseEnvelope<string>(
    isWasmAvailable()
      ? bg.formatThemePatchDslWasm(json)
      : fallback.formatThemePatchDslWasm(json),
  )
}
