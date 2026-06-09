/**
 * RFC 031 P1-5：位图压暗 — 仅 CSS `background-image` 换 brightness-only SVG blob URL。
 * `<img>` / `<picture>` 等 inline 媒体不改（Dynamic 对齐 DR「照片不动」）。
 */

import {
  analysisCanvasSize,
  analyzeImagePixelBuffer,
  brightnessFilterForAnalysis,
  type BackgroundImageAnalysis,
} from './background-image-analysis'
import {
  extractCssBackgroundImageUrls,
  hasBitmapBackgroundImage,
} from './background-image-css'
import {
  BG_IMAGE_BLOB_URL_ATTR,
  BG_IMAGE_FILTER_BACKUP_ATTR,
  BG_IMAGE_STYLE_BACKUP_ATTR,
  IMG_DARKEN_FILTER_BACKUP_ATTR,
  computeDeadlineMs,
  isPastDeadline,
  type SamplingBudget,
} from '@luban-ws/extension-settings'
import { createBrightnessDarkenBlobUrl } from './image-darken'

export interface BackgroundImageRecolorResult {
  elementsFiltered: number
  elementsScanned: number
}

export interface LoadedImageAnalysis {
  analysis: BackgroundImageAnalysis
  dataUrl: string
  width: number
  height: number
}

export type ImageAnalysisLoader = (url: string) => Promise<LoadedImageAnalysis | null>

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

/** 加载图片并下采样分析（需 CORS 可读像素）。 */
export async function loadAndAnalyzeImageUrl(
  url: string,
): Promise<LoadedImageAnalysis | null> {
  if (typeof document === 'undefined') return null
  try {
    const image = await loadImage(url)
    return analyzeLoadedImageElement(image, url)
  } catch {
    return null
  }
}

/** 将已加载图片绘制到离屏 canvas，返回分析与 data URL。 */
export function analyzeLoadedImageElement(
  image: HTMLImageElement | ImageBitmap,
  srcForLog = '',
): LoadedImageAnalysis | null {
  if (typeof document === 'undefined') return null
  const sw =
    image instanceof HTMLImageElement ? image.naturalWidth : image.width
  const sh =
    image instanceof HTMLImageElement ? image.naturalHeight : image.height
  const { width, height } = analysisCanvasSize(sw, sh)
  if (width === 0 || height === 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, sw, sh, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const analysis = analyzeImagePixelBuffer(imageData.data, width, height)
  if (!brightnessFilterForAnalysis(analysis)) return null

  let dataUrl: string
  try {
    dataUrl = canvas.toDataURL('image/png')
  } catch {
    void srcForLog
    return null
  }
  return { analysis, dataUrl, width: sw, height: sh }
}

function firstBackgroundImageUrl(el: HTMLElement): string | null {
  const inline = el.getAttribute('style') ?? ''
  if (hasBitmapBackgroundImage(inline)) {
    return extractCssBackgroundImageUrls(inline)[0] ?? null
  }
  const computed = getComputedStyle(el).backgroundImage
  if (!computed || computed === 'none') return null
  return extractCssBackgroundImageUrls(computed)[0] ?? null
}

/** 背景图：替换为 brightness-only SVG blob URL（不碰整元素 filter）。 */
export function applyBackgroundImageDarken(
  el: HTMLElement,
  loaded: LoadedImageAnalysis,
): boolean {
  if (el.getAttribute(BG_IMAGE_STYLE_BACKUP_ATTR) !== null) return false
  const currentBg =
    el.style.backgroundImage ||
    getComputedStyle(el).backgroundImage
  if (!currentBg || currentBg === 'none') return false

  const blobUrl = createBrightnessDarkenBlobUrl(
    loaded.dataUrl,
    loaded.width,
    loaded.height,
  )
  el.setAttribute(BG_IMAGE_STYLE_BACKUP_ATTR, currentBg)
  el.setAttribute(BG_IMAGE_BLOB_URL_ATTR, blobUrl)
  el.style.setProperty('background-image', `url("${blobUrl}")`, 'important')
  return true
}

export async function recolorElementBackgroundImage(
  el: HTMLElement,
  loader: ImageAnalysisLoader = loadAndAnalyzeImageUrl,
): Promise<boolean> {
  const url = firstBackgroundImageUrl(el)
  if (!url) return false
  const loaded = await loader(url)
  if (!loaded) return false
  return applyBackgroundImageDarken(el, loaded)
}

export async function recolorBackgroundImagesInSubtree(
  root: ParentNode,
  budget: SamplingBudget,
  loader: ImageAnalysisLoader = loadAndAnalyzeImageUrl,
  now: () => number = Date.now,
): Promise<BackgroundImageRecolorResult> {
  const candidates = collectBackgroundImageCandidates(root)
  const deadline = computeDeadlineMs(now(), budget.maxMs)
  let elementsFiltered = 0
  let processed = 0

  for (const el of candidates) {
    if (processed >= budget.maxNodes) break
    if (isPastDeadline(now(), deadline)) break
    processed += 1
    const ok = await recolorElementBackgroundImage(el, loader)
    if (ok) elementsFiltered += 1
  }

  return { elementsFiltered, elementsScanned: candidates.length }
}

export async function recolorBackgroundImagesInDocument(
  doc: Document = document,
  budget: SamplingBudget,
  loader?: ImageAnalysisLoader,
): Promise<BackgroundImageRecolorResult> {
  return recolorBackgroundImagesInSubtree(
    doc.documentElement,
    budget,
    loader,
  )
}

function collectBackgroundImageCandidates(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = []
  if (root instanceof HTMLElement && elementMayHaveBitmapBackground(root)) {
    out.push(root)
  }
  for (const node of Array.from(root.querySelectorAll('*'))) {
    if (node instanceof HTMLElement && elementMayHaveBitmapBackground(node)) {
      out.push(node)
    }
  }
  return out
}

function elementMayHaveBitmapBackground(el: HTMLElement): boolean {
  const inline = el.getAttribute('style') ?? ''
  if (hasBitmapBackgroundImage(inline)) return true
  const bg = getComputedStyle(el).backgroundImage
  return bg !== 'none' && hasBitmapBackgroundImage(bg)
}

function revokeBlobUrlIfAny(el: HTMLElement): void {
  const blob = el.getAttribute(BG_IMAGE_BLOB_URL_ATTR)
  if (blob) {
    try {
      URL.revokeObjectURL(blob)
    } catch {
      /* ignore */
    }
    el.removeAttribute(BG_IMAGE_BLOB_URL_ATTR)
  }
}

/** 还原 legacy 整元素 filter 备份。 */
export function restoreElementBackgroundImageFilter(el: HTMLElement): boolean {
  const backup = el.getAttribute(BG_IMAGE_FILTER_BACKUP_ATTR)
  if (backup === null) return false
  if (backup) {
    el.style.filter = backup
  } else {
    el.style.removeProperty('filter')
  }
  el.removeAttribute(BG_IMAGE_FILTER_BACKUP_ATTR)
  return true
}

export function restoreElementBackgroundImageStyle(el: HTMLElement): boolean {
  let restored = false
  const bgBackup = el.getAttribute(BG_IMAGE_STYLE_BACKUP_ATTR)
  if (bgBackup !== null) {
    if (bgBackup) {
      el.style.backgroundImage = bgBackup
    } else {
      el.style.removeProperty('background-image')
    }
    el.removeAttribute(BG_IMAGE_STYLE_BACKUP_ATTR)
    revokeBlobUrlIfAny(el)
    restored = true
  }
  return restored
}

export function restoreElementInlineImageFilter(el: HTMLElement): boolean {
  const backup = el.getAttribute(IMG_DARKEN_FILTER_BACKUP_ATTR)
  if (backup === null) return false
  if (backup) {
    el.style.filter = backup
  } else {
    el.style.removeProperty('filter')
  }
  el.removeAttribute(IMG_DARKEN_FILTER_BACKUP_ATTR)
  return true
}

export function restoreElementImageDarkening(el: HTMLElement): boolean {
  return (
    restoreElementBackgroundImageFilter(el) ||
    restoreElementBackgroundImageStyle(el) ||
    restoreElementInlineImageFilter(el)
  )
}

export function restoreBackgroundImageFiltersInSubtree(root: ParentNode): number {
  const selector = [
    BG_IMAGE_FILTER_BACKUP_ATTR,
    BG_IMAGE_STYLE_BACKUP_ATTR,
    IMG_DARKEN_FILTER_BACKUP_ATTR,
  ]
    .map((a) => `[${a}]`)
    .join(', ')
  let restored = 0
  for (const node of Array.from(root.querySelectorAll(selector))) {
    if (node instanceof HTMLElement && restoreElementImageDarkening(node)) {
      restored += 1
    }
  }
  return restored
}

export function restoreBackgroundImageFiltersInDocument(
  doc: Document = document,
): number {
  return restoreBackgroundImageFiltersInSubtree(doc.documentElement)
}

/** @deprecated 使用 `loadAndAnalyzeImageUrl` */
export const analyzeBackgroundImageUrl = loadAndAnalyzeImageUrl

/** @deprecated 使用 `analyzeLoadedImageElement` */
export const analyzeLoadedImage = analyzeLoadedImageElement

/** @deprecated 不再对容器整元素 filter */
export function applyElementBackgroundImageFilter(
  _el: HTMLElement,
  _filter: string,
): boolean {
  return false
}
