/**
 * 位图压暗：仅用 brightness（feComponentTransfer），禁止 invert / hue-rotate。
 * 对齐 DR Dynamic 的「压暗亮图」目标，但不走整页反相矩阵。
 */

import { DEFAULT_LIGHT_BG_IMAGE_BRIGHTNESS } from './background-image-analysis'

const XML_ESCAPE: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
}

/** 嵌入 SVG `<image xlink:href>` 前转义。 */
export function escapeXmlAttr(value: string): string {
  return value.replace(/[<>&'"]/g, (ch) => XML_ESCAPE[ch] ?? ch)
}

/** brightness-only SVG 滤镜 id（避免与页面冲突）。 */
export const IMAGE_DARKEN_FILTER_ID = 'change-dark-brightness' as const

/**
 * 生成带 brightness 滤镜的 SVG 字符串（仅压暗 RGB，不反相）。
 * @param brightness 0..1，默认 0.7 → slope 0.7
 */
export function buildBrightnessDarkenSvg(
  dataUrl: string,
  width: number,
  height: number,
  brightness: number = DEFAULT_LIGHT_BG_IMAGE_BRIGHTNESS,
): string {
  const slope = Math.max(0.1, Math.min(1, brightness))
  const href = escapeXmlAttr(dataUrl)
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">`,
    '<defs>',
    `<filter id="${IMAGE_DARKEN_FILTER_ID}" color-interpolation-filters="sRGB">`,
    '<feComponentTransfer>',
    `<feFuncR type="linear" slope="${slope}"/>`,
    `<feFuncG type="linear" slope="${slope}"/>`,
    `<feFuncB type="linear" slope="${slope}"/>`,
    '</feComponentTransfer>',
    '</filter>',
    '</defs>',
    `<image width="${w}" height="${h}" filter="url(#${IMAGE_DARKEN_FILTER_ID})" xlink:href="${href}"/>`,
    '</svg>',
  ].join('')
}

/** 将 SVG 压暗包装转为 blob URL（调用方 restore 时需 revoke）。 */
export function createBrightnessDarkenBlobUrl(
  dataUrl: string,
  width: number,
  height: number,
  brightness: number = DEFAULT_LIGHT_BG_IMAGE_BRIGHTNESS,
): string {
  const svg = buildBrightnessDarkenSvg(dataUrl, width, height, brightness)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return URL.createObjectURL(blob)
}

/** `<img>` 等元素：仅自身 `filter: brightness(N%)`，不影响子树。 */
export function cssBrightnessFilterForImage(
  brightness: number = DEFAULT_LIGHT_BG_IMAGE_BRIGHTNESS,
): string {
  const pct = Math.round(Math.max(0.1, Math.min(1, brightness)) * 100)
  return `brightness(${pct}%)`
}
