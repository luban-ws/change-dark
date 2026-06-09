/**
 * RFC 031 P1-5：DOM 位图背景图亮度分析 + `filter: brightness()` 注入。
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
import { BG_IMAGE_FILTER_BACKUP_ATTR } from './constants'
import {
  computeDeadlineMs,
  isPastDeadline,
  type SamplingBudget,
} from './sampling-budget'

export interface BackgroundImageRecolorResult {
  elementsFiltered: number
  elementsScanned: number
}

export type ImageAnalysisLoader = (url: string) => Promise<BackgroundImageAnalysis | null>

/** 默认 loader：canvas 下采样 + 像素分析（需浏览器环境）。 */
export async function analyzeBackgroundImageUrl(
  url: string,
): Promise<BackgroundImageAnalysis | null> {
  if (typeof document === 'undefined') return null
  try {
    const image = await loadImage(url)
    return analyzeLoadedImage(image)
  } catch {
    return null
  }
}

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

/** 将已加载图片绘制到离屏 canvas 并分析。 */
export function analyzeLoadedImage(
  image: HTMLImageElement | ImageBitmap,
): BackgroundImageAnalysis | null {
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
  return analyzeImagePixelBuffer(imageData.data, width, height)
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

/** 备份并写入 `filter`（仅当分析结果为亮图）。 */
export async function recolorElementBackgroundImage(
  el: HTMLElement,
  loader: ImageAnalysisLoader = analyzeBackgroundImageUrl,
): Promise<boolean> {
  const url = firstBackgroundImageUrl(el)
  if (!url) return false
  const analysis = await loader(url)
  if (!analysis) return false
  const filter = brightnessFilterForAnalysis(analysis)
  if (!filter) return false
  return applyElementBackgroundImageFilter(el, filter)
}

export function applyElementBackgroundImageFilter(
  el: HTMLElement,
  filter: string,
): boolean {
  if (el.getAttribute(BG_IMAGE_FILTER_BACKUP_ATTR) === null) {
    el.setAttribute(BG_IMAGE_FILTER_BACKUP_ATTR, el.style.filter || '')
  }
  el.style.setProperty('filter', filter, 'important')
  return true
}

/** 扫描子树中带位图背景的元素并按预算改色。 */
export async function recolorBackgroundImagesInSubtree(
  root: ParentNode,
  budget: SamplingBudget,
  loader: ImageAnalysisLoader = analyzeBackgroundImageUrl,
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
    if (await recolorElementBackgroundImage(el, loader)) {
      elementsFiltered += 1
    }
  }

  return { elementsFiltered, elementsScanned: candidates.length }
}

/** 整文档位图背景扫描。 */
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

export function restoreBackgroundImageFiltersInSubtree(root: ParentNode): number {
  const nodes = root.querySelectorAll(`[${BG_IMAGE_FILTER_BACKUP_ATTR}]`)
  let restored = 0
  for (const node of Array.from(nodes)) {
    if (node instanceof HTMLElement && restoreElementBackgroundImageFilter(node)) {
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
