/**
 * RFC 031 P1-4：MutationObserver 触发的改色增量计划与 flush（纯函数，可单测）。
 */

import {
  STYLE_ELEMENT_CUSTOM_CSS_ID,
  STYLE_ELEMENT_ID,
  STYLE_ELEMENT_TYPOGRAPHY_ID,
  computeDeadlineMs,
  isPastDeadline,
  type SamplingBudget,
  type ThemeFiltersStateV1,
} from '@change-dark/extension-settings'
import { recolorElementInlineStyle } from './inline-style-recolor'
import { hasBitmapBackgroundImage } from './background-image-css'
import { applyRecolorInjection } from './recolor-inject'
import { DEFAULT_DARK_PROFILE, type ColorProfile } from './modify-colors'

/** 单次 mutation 批次合并后的改色计划。 */
export interface RecolorMutationPlan {
  rebuildStylesheets: boolean
  inlineElements: HTMLElement[]
  /** 新增/变更且可能含位图背景的元素（P1-5 idle 扫描）。 */
  backgroundImageElements: HTMLElement[]
}

export interface RecolorMutationFlushResult {
  stylesheetRebuilt: boolean
  inlineElementsRecolored: number
}

const EXTENSION_INJECTION_IDS = new Set([
  STYLE_ELEMENT_ID,
  STYLE_ELEMENT_TYPOGRAPHY_ID,
  STYLE_ELEMENT_CUSTOM_CSS_ID,
])

/** 扩展自身注入节点上的 DOM 变更应忽略，避免 ensureStyleElement ↔ MO 死循环。 */
export function isExtensionInjectionElement(el: Element): boolean {
  const id = el.id
  return id !== '' && EXTENSION_INJECTION_IDS.has(id)
}

/** 是否为本扩展注入节点或其子树内的 mutation。 */
export function isExtensionInjectionMutation(record: MutationRecord): boolean {
  const related: Node[] = [record.target]
  if (record.type === 'childList') {
    related.push(
      ...Array.from(record.addedNodes ?? []),
      ...Array.from(record.removedNodes ?? []),
    )
  }
  for (const node of related) {
    if (!(node instanceof Element)) continue
    if (isExtensionInjectionElement(node)) return true
    const root = node.getRootNode()
    if (root instanceof ShadowRoot) continue
  }
  return false
}

function collectBackgroundImageElements(root: HTMLElement, out: Set<HTMLElement>): void {
  if (elementMayHaveBitmapBackground(root)) out.add(root)
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el instanceof HTMLElement && elementMayHaveBitmapBackground(el)) {
      out.add(el)
    }
  }
}

function elementMayHaveBitmapBackground(el: HTMLElement): boolean {
  const inline = el.getAttribute('style') ?? ''
  if (hasBitmapBackgroundImage(inline)) return true
  if (typeof getComputedStyle === 'undefined') return false
  const bg = getComputedStyle(el).backgroundImage
  return bg !== 'none' && hasBitmapBackgroundImage(bg)
}

function collectInlineStyleElements(root: HTMLElement, out: Set<HTMLElement>): void {
  if (root.hasAttribute('style')) out.add(root)
  for (const el of Array.from(root.querySelectorAll('[style]'))) {
    if (el instanceof HTMLElement) out.add(el)
  }
}

function flagStylesheetNode(node: Node | null, flag: { rebuild: boolean }): void {
  if (!node || !(node instanceof Element)) return
  if (node instanceof HTMLStyleElement && !isExtensionInjectionElement(node)) {
    flag.rebuild = true
  }
  if (
    node instanceof HTMLLinkElement &&
    (node.rel || '').toLowerCase().includes('stylesheet') &&
    !isExtensionInjectionElement(node)
  ) {
    flag.rebuild = true
  }
}

/**
 * 将 MutationObserver 记录合并为改色计划（rAF 合并后一次传入多条 record）。
 */
export function analyzeRecolorMutations(
  records: readonly MutationRecord[],
): RecolorMutationPlan {
  const inlineElements = new Set<HTMLElement>()
  const backgroundImageElements = new Set<HTMLElement>()
  const flag = { rebuild: false }

  for (const record of records) {
    if (isExtensionInjectionMutation(record)) continue

    if (record.type === 'childList') {
      for (const node of Array.from(record.addedNodes ?? [])) {
        flagStylesheetNode(node, flag)
        if (node instanceof HTMLElement) {
          collectInlineStyleElements(node, inlineElements)
          collectBackgroundImageElements(node, backgroundImageElements)
        }
      }
      for (const node of Array.from(record.removedNodes ?? [])) {
        flagStylesheetNode(node, flag)
      }
    }

    if (record.type === 'attributes') {
      const target = record.target
      if (record.attributeName === 'style' && target instanceof HTMLElement) {
        if (!isExtensionInjectionElement(target)) {
          inlineElements.add(target)
          if (elementMayHaveBitmapBackground(target)) {
            backgroundImageElements.add(target)
          }
        }
      }
      if (
        record.attributeName === 'href' &&
        target instanceof HTMLLinkElement &&
        !isExtensionInjectionElement(target)
      ) {
        flag.rebuild = true
      }
    }

    if (record.type === 'characterData') {
      const parent = record.target.parentElement
      if (parent instanceof HTMLStyleElement && !isExtensionInjectionElement(parent)) {
        flag.rebuild = true
      }
    }
  }

  return {
    rebuildStylesheets: flag.rebuild,
    inlineElements: [...inlineElements],
    backgroundImageElements: [...backgroundImageElements],
  }
}

/** RFC 031 P1-4 flush：按 RFC 006 预算墙处理内联元素；stylesheet 变更则全量重建覆盖层。 */
export function applyRecolorMutationFlush(
  doc: Document,
  plan: RecolorMutationPlan,
  themeFilters: ThemeFiltersStateV1,
  budget: SamplingBudget,
  profile: ColorProfile = DEFAULT_DARK_PROFILE,
  baseCss = '',
  now: () => number = Date.now,
): RecolorMutationFlushResult {
  let stylesheetRebuilt = false
  let inlineElementsRecolored = 0

  if (plan.rebuildStylesheets) {
    applyRecolorInjection(doc, themeFilters, profile, baseCss)
    stylesheetRebuilt = true
  }

  const deadline = computeDeadlineMs(now(), budget.maxMs)
  let processed = 0
  for (const el of plan.inlineElements) {
    if (processed >= budget.maxNodes) break
    if (isPastDeadline(now(), deadline)) break
    if (isExtensionInjectionElement(el)) continue
    if (recolorElementInlineStyle(el, profile)) {
      inlineElementsRecolored += 1
    }
    processed += 1
  }

  return { stylesheetRebuilt, inlineElementsRecolored }
}

/** 标准 MO 配置：`<style>`/`<link>`/内联 style/keyframes 文本变更。 */
export const RECOLOR_MUTATION_OBSERVER_INIT: MutationObserverInit = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'href'],
  characterData: true,
}
