// @ts-expect-error wasm-bindgen 生成的 dark_engine_bg.js 无同级 .d.ts，下方以显式接口约束导出类型
import * as rawBg from '../pkg/dark_engine_bg.js'
import wasmDataUrl from '../pkg/dark_engine_bg.wasm?inline'

export interface DarkEngineBgExports {
  __wbg_set_wasm(val: unknown): void
  analyzeBackgroundImageRgbaWasm(
    data: Uint8Array,
    width: number,
    height: number,
  ): Uint32Array
  batchModifyColor(
    rgb: Uint8Array,
    uses: Uint8Array,
    profile_tag: number,
  ): Uint8Array
  batch_mix_toward_black(rgb: Uint8Array, amount: number): Uint8Array
  batch_relative_luminance(rgb: Uint8Array): Float64Array
  brightnessFilterForBackgroundImageWasm(
    is_dark: boolean,
    is_light: boolean,
    is_transparent: boolean,
  ): string
  compileThemeDslWasm(source: string): string
  compileThemePatchDslWasm(source: string): string
  formatThemePatchDslWasm(patch_json: string): string
  kMeansDarkerCentroid(rgb: Uint8Array, max_iter: number): Uint8Array
  kMeansRgbCentroids(rgb: Uint8Array, k: number, max_iter: number): Uint8Array
  luminance_u8(r: number, g: number, b: number): number
  max_batch_rgb_bytes(): number
  mix_toward_black(r: number, g: number, b: number, amount: number): Uint8Array
  modifyColor(
    r: number,
    g: number,
    b: number,
    use_tag: number,
    profile_tag: number,
  ): Uint8Array
  parseCssColorTokenWasm(input: string): Uint8Array
  suggested_foreground_for_dark_bg(r: number, g: number, b: number): Uint8Array
}

const bg = rawBg as unknown as DarkEngineBgExports

function decodeBase64DataUrl(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',')
  const base64 = commaIdx === -1 ? dataUrl : dataUrl.slice(commaIdx + 1)
  if (typeof Buffer === 'function' && typeof Buffer.from === 'function') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function loadWasmBytes(): Promise<Uint8Array> {
  if (typeof wasmDataUrl === 'string' && wasmDataUrl.startsWith('data:')) {
    return decodeBase64DataUrl(wasmDataUrl)
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    const fsModule = ['node', 'fs/promises'].join(':')
    const fs = (await import(/* @vite-ignore */ fsModule)) as typeof import('node:fs/promises')
    if (typeof wasmDataUrl === 'string' && wasmDataUrl.startsWith('/@fs/')) {
      const fsPath = wasmDataUrl.slice('/@fs'.length).split('?')[0]!
      return new Uint8Array(await fs.readFile(fsPath))
    }
    if (import.meta.url.startsWith('file:')) {
      const relWasm = ['..', 'pkg', 'dark_engine_bg.wasm'].join('/')
      const wasmPath = new URL(relWasm, import.meta.url)
      return new Uint8Array(await fs.readFile(wasmPath))
    }
    const localPath =
      typeof wasmDataUrl === 'string'
        ? wasmDataUrl.split('?')[0]!
        : '../pkg/dark_engine_bg.wasm'
    return new Uint8Array(await fs.readFile(localPath))
  }
  const res = await fetch(wasmDataUrl)
  return new Uint8Array(await res.arrayBuffer())
}

let wasmLoaded = false

interface WebAssemblyGlobal {
  instantiate(
    bytes: Uint8Array,
    imports: Record<string, Record<string, unknown>>,
  ): Promise<{ instance: { exports: Record<string, unknown> } }>
}

try {
  const wa = (globalThis as { WebAssembly?: WebAssemblyGlobal }).WebAssembly
  if (!wa) throw new Error('WebAssembly unavailable')
  const bytes = await loadWasmBytes()
  const { instance } = await wa.instantiate(bytes, {
    './dark_engine_bg.js': bg as unknown as Record<string, unknown>,
  })
  bg.__wbg_set_wasm(instance.exports)
  const start = instance.exports.__wbindgen_start
  if (typeof start === 'function') {
    ;(start as () => void)()
  }
  wasmLoaded = true
} catch {
  // 严格 CSP（如未授权 `'wasm-unsafe-eval'` 的站点）会拒绝 WebAssembly.instantiate；降级到纯 JS 实现。
  wasmLoaded = false
}

export function isWasmAvailable(): boolean {
  return wasmLoaded
}

export { bg }
