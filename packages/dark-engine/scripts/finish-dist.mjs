/**
 * Vite 产出 ESM 与 sourcemap 后：写入对外唯一的类型入口与 CJS 桥（WASM 已内联进 index.mjs）。
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const distMjs = resolve(dist, 'index.mjs')
const typesSrc = resolve(root, 'pkg/dark_engine.d.ts')
const typesDest = resolve(dist, 'index.d.ts')
const distCjs = resolve(dist, 'index.cjs')
if (!existsSync(distMjs)) {
  console.error('[finish-dist] missing dist/index.mjs; run vite build first')
  process.exit(1)
}
if (!existsSync(typesSrc)) {
  console.error('[finish-dist] missing pkg/dark_engine.d.ts; run wasm-pack first')
  process.exit(1)
}

copyFileSync(typesSrc, typesDest)

/** TS 薄封装（`src/modify-color.ts`）— 与 wasm d.ts 合并为单一对外入口。 */
const modifyColorTypes = `
export declare const COLOR_USE_BG: 0;
export declare const COLOR_USE_FG: 1;
export declare const COLOR_USE_BORDER: 2;
export type ColorUseTag =
  | typeof COLOR_USE_BG
  | typeof COLOR_USE_FG
  | typeof COLOR_USE_BORDER;
export declare function colorUseToTag(use: 'bg' | 'fg' | 'border'): ColorUseTag;
export declare function modifyColorRgb(
  r: number,
  g: number,
  b: number,
  useTag: ColorUseTag,
  profileTag?: RecolorProfileTag,
): [number, number, number];
export declare const PROFILE_TAG_DARK: 0;
export declare const PROFILE_TAG_SOLARIZED_DARK: 1;
export type RecolorProfileTag =
  | typeof PROFILE_TAG_DARK
  | typeof PROFILE_TAG_SOLARIZED_DARK;
export declare function batchModifyColorRgb(
  rgb: Uint8Array,
  uses: Uint8Array,
  profileTag?: RecolorProfileTag,
): Uint8Array;
export interface WasmBackgroundImageAnalysis {
  isDark: boolean;
  isLight: boolean;
  isTransparent: boolean;
  opaquePixelCount: number;
  totalPixelCount: number;
}
export declare function analyzeBackgroundImageRgba(
  data: Uint8Array,
  width: number,
  height: number,
): WasmBackgroundImageAnalysis;
export declare function brightnessFilterForBackgroundImage(
  analysis: Pick<WasmBackgroundImageAnalysis, 'isDark' | 'isLight' | 'isTransparent'>,
): string | null;
export interface ParsedCssRgb {
  r: number;
  g: number;
  b: number;
}
export declare function parseCssColorTokenWasmRgb(input: string): ParsedCssRgb | null;
export type ThemeDslColorUseKind = 'bg' | 'fg' | 'border';
export interface ThemeDslError {
  message: string;
  line: number;
  column: number;
  offset: number;
}
export type ThemeDslResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ThemeDslError };
export interface ThemeDslMatchV1 {
  hostEquals?: string[];
  hostSuffix?: string[];
  pathPrefix?: string[];
}
export interface ThemeDslGutterProbeV1 {
  mainSelector: string;
  insetPx: number;
}
export interface ThemeDslSurfaceRepairV1 {
  landmarkSelectors?: string[];
  componentClassHints?: string[];
  neverPaint?: string[];
  minPanelAreaPx?: number;
  minPanelWidthPx?: number;
  minPanelHeightPx?: number;
  gutterProbe?: ThemeDslGutterProbeV1;
}
export interface ThemeDslCssVarSubstituteV1 {
  use: ThemeDslColorUseKind;
  fallback?: string;
}
export interface ThemeDslRecolorV1 {
  forceShorthandProperties?: string[];
  cssVarSubstitute?: Record<string, ThemeDslCssVarSubstituteV1>;
}
export interface ThemeDslSiteProfileV1 {
  v: 1;
  id: string;
  match: ThemeDslMatchV1;
  priority?: number;
  surfaceRepair?: ThemeDslSurfaceRepairV1;
  recolor?: ThemeDslRecolorV1;
  customCss?: string;
}
export interface ThemeDslSiteProfilePatchV1 {
  disabled?: boolean;
  surfaceRepair?: Partial<ThemeDslSurfaceRepairV1>;
  recolor?: Partial<ThemeDslRecolorV1>;
  customCss?: string;
}
export declare function compileThemeDsl(
  source: string,
): ThemeDslResult<ThemeDslSiteProfileV1[]>;
export declare function compileThemePatchDsl(
  source: string,
): ThemeDslResult<ThemeDslSiteProfilePatchV1>;
export declare function compileThemePatchDslAsync(
  source: string,
): Promise<ThemeDslResult<ThemeDslSiteProfilePatchV1>>;
export declare function formatThemePatchDsl(
  patch: ThemeDslSiteProfilePatchV1,
): ThemeDslResult<string>;
export declare function isWasmAvailable(): boolean;
`

writeFileSync(typesDest, `${readFileSync(typesDest, 'utf8')}${modifyColorTypes}`, 'utf8')

const bridge = `'use strict'

const { pathToFileURL } = require('node:url')
const { resolve: pathResolve } = require('node:path')

// require() → Promise（WASM + top-level await 无法做成同步 CJS）
module.exports = import(pathToFileURL(pathResolve(__dirname, 'index.mjs')).href)
`

writeFileSync(distCjs, bridge, 'utf8')
