/**
 * Pure-JS fallback for `@change-dark/dark-engine` when host page CSP forbids `WebAssembly.instantiate`
 * (e.g. `default-src 'none'; script-src 'nonce-...'` without `'wasm-unsafe-eval'`).
 */

const MAX_BATCH_RGB_BYTES = 3 * 524_288

interface Rgb {
  r: number
  g: number
  b: number
}

interface Hsl {
  h: number
  s: number
  l: number
}

interface ColorProfile {
  maxBgLightness: number
  minFgLightness: number
  poleBg: Hsl
  poleFg: Hsl
}

function channelToLinear(c: number): number {
  const x = c / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

export function luminance_u8(r: number, g: number, b: number): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export function max_batch_rgb_bytes(): number {
  return MAX_BATCH_RGB_BYTES
}

export function mix_toward_black(r: number, g: number, b: number, amount: number): Uint8Array {
  const a = Math.min(1, Math.max(0, amount))
  const scale = 1 - a
  return new Uint8Array([
    Math.round(r * scale),
    Math.round(g * scale),
    Math.round(b * scale),
  ])
}

export function suggested_foreground_for_dark_bg(r: number, g: number, b: number): Uint8Array {
  const lum = luminance_u8(r, g, b)
  return lum > 0.55 ? new Uint8Array([18, 18, 22]) : new Uint8Array([230, 230, 235])
}

export function batch_relative_luminance(rgb: Uint8Array): Float64Array {
  if (rgb.length % 3 !== 0) {
    throw new Error('rgb length must be a multiple of 3')
  }
  const n = rgb.length / 3
  const out = new Float64Array(n)
  for (let i = 0; i < n; i += 1) {
    const b = i * 3
    out[i] = luminance_u8(rgb[b]!, rgb[b + 1]!, rgb[b + 2]!)
  }
  return out
}

export function batch_mix_toward_black(rgb: Uint8Array, amount: number): Uint8Array {
  if (rgb.length % 3 !== 0 || rgb.length > MAX_BATCH_RGB_BYTES) {
    throw new Error('invalid batch rgb buffer')
  }
  const a = Math.min(1, Math.max(0, amount))
  const s = 1 - a
  const out = new Uint8Array(rgb.length)
  for (let i = 0; i < rgb.length; i += 1) {
    out[i] = Math.round(rgb[i]! * s)
  }
  return out
}

export function kMeansRgbCentroids(rgb: Uint8Array, k: number, maxIter: number): Uint8Array {
  if (rgb.length === 0 || rgb.length % 3 !== 0 || rgb.length > MAX_BATCH_RGB_BYTES) {
    throw new Error('invalid rgb buffer')
  }
  const n = rgb.length / 3
  const kEff = Math.min(Math.max(1, k | 0), Math.min(32, n))
  const iters = Math.min(Math.max(1, maxIter | 0), 500)
  const centroids = new Float64Array(kEff * 3)
  for (let c = 0; c < kEff; c += 1) {
    centroids[c * 3] = rgb[c * 3]!
    centroids[c * 3 + 1] = rgb[c * 3 + 1]!
    centroids[c * 3 + 2] = rgb[c * 3 + 2]!
  }
  const sums = new Float64Array(kEff * 3)
  const counts = new Int32Array(kEff)

  for (let iter = 0; iter < iters; iter += 1) {
    sums.fill(0)
    counts.fill(0)
    for (let i = 0; i < n; i += 1) {
      const r = rgb[i * 3]!
      const g = rgb[i * 3 + 1]!
      const b = rgb[i * 3 + 2]!
      let best = 0
      let bestDist = Infinity
      for (let c = 0; c < kEff; c += 1) {
        const dr = r - centroids[c * 3]!
        const dg = g - centroids[c * 3 + 1]!
        const db = b - centroids[c * 3 + 2]!
        const d = dr * dr + dg * dg + db * db
        if (d < bestDist) {
          bestDist = d
          best = c
        }
      }
      sums[best * 3] += r
      sums[best * 3 + 1] += g
      sums[best * 3 + 2] += b
      counts[best] += 1
    }
    for (let c = 0; c < kEff; c += 1) {
      if (counts[c]! > 0) {
        centroids[c * 3] = sums[c * 3]! / counts[c]!
        centroids[c * 3 + 1] = sums[c * 3 + 1]! / counts[c]!
        centroids[c * 3 + 2] = sums[c * 3 + 2]! / counts[c]!
      }
    }
  }

  const out = new Uint8Array(kEff * 3)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Math.round(centroids[i]!)
  }
  return out
}

export function kMeansDarkerCentroid(rgb: Uint8Array, _maxIter: number): Uint8Array {
  if (rgb.length === 0 || rgb.length % 3 !== 0 || rgb.length > MAX_BATCH_RGB_BYTES) {
    throw new Error('invalid rgb buffer')
  }
  const n = rgb.length / 3
  const indices = Array.from({ length: n }, (_, i) => i)
  const lums = new Float64Array(n)
  for (let i = 0; i < n; i += 1) {
    lums[i] = luminance_u8(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!)
  }
  indices.sort((a, b) => lums[a]! - lums[b]!)
  const pick = indices[Math.min(n - 1, Math.floor(n * 0.2))]!
  return new Uint8Array([rgb[pick * 3]!, rgb[pick * 3 + 1]!, rgb[pick * 3 + 2]!])
}

function rgbToHsl(rgb: Rgb): Hsl {
  const rn = rgb.r / 255
  const gn = rgb.g / 255
  const bn = rgb.b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) * 60
    } else {
      h = ((rn - gn) / d + 4) * 60
    }
  }
  return { h, s, l }
}

function hslToRgb(hsl: Hsl): Rgb {
  const hn = (((hsl.h % 360) + 360) % 360) / 360
  if (hsl.s === 0) {
    const v = Math.round(hsl.l * 255)
    return { r: v, g: v, b: v }
  }
  const q = hsl.l < 0.5 ? hsl.l * (1 + hsl.s) : hsl.l + hsl.s - hsl.l * hsl.s
  const p = 2 * hsl.l - q
  const ch = (t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 0.5) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return {
    r: Math.round(ch(hn + 1 / 3) * 255),
    g: Math.round(ch(hn) * 255),
    b: Math.round(ch(hn - 1 / 3) * 255),
  }
}

function scale(x: number, inLo: number, inHi: number, outLo: number, outHi: number): number {
  if (Math.abs(inHi - inLo) < 1e-12) return outLo
  return outLo + ((x - inLo) * (outHi - outLo)) / (inHi - inLo)
}

const DARK_PROFILE: ColorProfile = {
  maxBgLightness: 0.4,
  minFgLightness: 0.55,
  poleBg: rgbToHsl({ r: 0x18, g: 0x1a, b: 0x1b }),
  poleFg: rgbToHsl({ r: 0xe8, g: 0xe6, b: 0xe3 }),
}

const SOLARIZED_DARK_PROFILE: ColorProfile = {
  maxBgLightness: 0.4,
  minFgLightness: 0.55,
  poleBg: rgbToHsl({ r: 0, g: 43, b: 54 }),
  poleFg: rgbToHsl({ r: 147, g: 161, b: 161 }),
}

function isNeutralBg(hsl: Hsl): boolean {
  return hsl.l < 0.2 || hsl.s < 0.24 || (hsl.l > 0.8 && hsl.h > 200 && hsl.h < 280)
}

function isNeutralFg(hsl: Hsl): boolean {
  return hsl.l < 0.2 || hsl.s < 0.24
}

export function modifyColor(
  r: number,
  g: number,
  b: number,
  useTag: number,
  profileTag: number,
): Uint8Array {
  const profile = profileTag === 1 ? SOLARIZED_DARK_PROFILE : DARK_PROFILE
  const hsl = rgbToHsl({ r, g, b })
  let outHsl: Hsl

  if (useTag === 1) {
    const l =
      hsl.l > 0.5
        ? scale(hsl.l, 0.5, 1, profile.minFgLightness, profile.poleFg.l)
        : scale(hsl.l, 0, 0.5, profile.poleFg.l, profile.minFgLightness)
    outHsl = isNeutralFg(hsl)
      ? { h: profile.poleFg.h, s: profile.poleFg.s, l }
      : {
          h: hsl.h > 205 && hsl.h < 245 ? scale(hsl.h, 205, 245, 205, 220) : hsl.h,
          s: hsl.s,
          l,
        }
  } else if (useTag === 2) {
    const l = scale(hsl.l, 0, 1, 0.5, 0.2)
    outHsl = isNeutralBg(hsl)
      ? { h: profile.poleBg.h, s: profile.poleBg.s, l }
      : { h: hsl.h, s: hsl.s, l }
  } else {
    const lBase =
      hsl.l < 0.5
        ? scale(hsl.l, 0, 0.5, 0, profile.maxBgLightness)
        : scale(hsl.l, 0.5, 1, profile.maxBgLightness, profile.poleBg.l)
    if (isNeutralBg(hsl)) {
      outHsl = { h: profile.poleBg.h, s: profile.poleBg.s, l: lBase }
    } else {
      let h = hsl.h
      let lMul = 1
      if (h > 60 && h < 180) {
        h = h < 120 ? scale(h, 60, 120, 60, 105) : scale(h, 120, 180, 135, 180)
        if (h < 80) lMul = 0.75
      }
      outHsl = { h, s: hsl.s, l: Math.min(1, Math.max(0, lBase * lMul)) }
    }
  }

  const out = hslToRgb(outHsl)
  return new Uint8Array([out.r, out.g, out.b])
}

export function batchModifyColor(
  rgb: Uint8Array,
  uses: Uint8Array,
  profileTag: number,
): Uint8Array {
  if (rgb.length === 0 || rgb.length % 3 !== 0 || uses.length !== rgb.length / 3) {
    throw new Error('invalid batchModifyColor input')
  }
  const out = new Uint8Array(rgb.length)
  for (let i = 0; i < uses.length; i += 1) {
    const c = modifyColor(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!, uses[i]!, profileTag)
    out[i * 3] = c[0]!
    out[i * 3 + 1] = c[1]!
    out[i * 3 + 2] = c[2]!
  }
  return out
}

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  navy: [0, 0, 128],
  teal: [0, 128, 128],
  maroon: [128, 0, 0],
}

export function parseCssColorTokenWasm(input: string): Uint8Array {
  const s = input.trim().toLowerCase()
  if (!s || s === 'transparent' || s.includes('var(')) return new Uint8Array(0)
  const named = NAMED_COLORS[s]
  if (named) return new Uint8Array(named)

  if (s.startsWith('#')) {
    const hex = s.slice(1)
    if (/^[0-9a-f]{3,4}$/.test(hex)) {
      return new Uint8Array([
        parseInt(hex[0]! + hex[0]!, 16),
        parseInt(hex[1]! + hex[1]!, 16),
        parseInt(hex[2]! + hex[2]!, 16),
      ])
    }
    if (/^[0-9a-f]{6}$|^[0-9a-f]{8}$/.test(hex)) {
      return new Uint8Array([
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ])
    }
    return new Uint8Array(0)
  }

  const rgbMatch = s.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  )
  if (rgbMatch) {
    if (rgbMatch[4] !== undefined) {
      const a = rgbMatch[4].endsWith('%')
        ? parseFloat(rgbMatch[4]) / 100
        : parseFloat(rgbMatch[4])
      if (Number.isFinite(a) && a <= 0) return new Uint8Array(0)
    }
    return new Uint8Array([
      Math.min(255, Math.max(0, Math.round(Number(rgbMatch[1])))),
      Math.min(255, Math.max(0, Math.round(Number(rgbMatch[2])))),
      Math.min(255, Math.max(0, Math.round(Number(rgbMatch[3])))),
    ])
  }

  const hslMatch = s.match(
    /^hsla?\(\s*(-?\d+(?:\.\d+)?)(?:deg)?\s*[,\s]\s*(\d+(?:\.\d+)?)%\s*[,\s]\s*(\d+(?:\.\d+)?)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  )
  if (hslMatch) {
    if (hslMatch[4] !== undefined) {
      const a = hslMatch[4].endsWith('%')
        ? parseFloat(hslMatch[4]) / 100
        : parseFloat(hslMatch[4])
      if (Number.isFinite(a) && a <= 0) return new Uint8Array(0)
    }
    const rgb = hslToRgb({
      h: Number(hslMatch[1]),
      s: Math.min(1, Math.max(0, Number(hslMatch[2]) / 100)),
      l: Math.min(1, Math.max(0, Number(hslMatch[3]) / 100)),
    })
    return new Uint8Array([rgb.r, rgb.g, rgb.b])
  }

  return new Uint8Array(0)
}

export function analyzeBackgroundImageRgbaWasm(
  data: Uint8Array,
  width: number,
  height: number,
): Uint32Array {
  const total = Math.max(0, (width | 0) * (height | 0))
  const len = Math.min(data.length, total * 4)
  let opaque = 0
  let darkCount = 0
  let lightCount = 0
  for (let i = 0; i + 3 < len; i += 4) {
    if (data[i + 3]! < 32) continue
    opaque += 1
    const lum = luminance_u8(data[i]!, data[i + 1]!, data[i + 2]!)
    if (lum < 0.2) darkCount += 1
    else if (lum > 0.55) lightCount += 1
  }
  const isTransparent = opaque === 0 ? 1 : 0
  const isDark = !isTransparent && darkCount >= opaque * 0.6 ? 1 : 0
  const isLight = !isTransparent && lightCount >= opaque * 0.6 ? 1 : 0
  return new Uint32Array([isDark, isLight, isTransparent, opaque, total])
}

export function brightnessFilterForBackgroundImageWasm(
  isDark: boolean,
  isLight: boolean,
  isTransparent: boolean,
): string {
  return isLight && !isDark && !isTransparent ? 'brightness(70%)' : ''
}

export function compileThemeDslWasm(_source: string): string {
  return '{"ok":true,"data":[]}'
}

export function compileThemePatchDslWasm(_source: string): string {
  return JSON.stringify({
    ok: false,
    error: { message: 'WASM unavailable under page CSP', line: 1, column: 1, offset: 0 },
  })
}

export function formatThemePatchDslWasm(_patchJson: string): string {
  return JSON.stringify({
    ok: false,
    error: { message: 'WASM unavailable under page CSP', line: 1, column: 1, offset: 0 },
  })
}
