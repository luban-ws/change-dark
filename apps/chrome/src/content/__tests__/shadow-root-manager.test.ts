/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SHADOW_STYLE_OWNED_ATTR,
  resolveThemePalette,
} from '@change-dark/dynamic-recolor'
import { ROOT_ATTR, STYLE_ELEMENT_ID } from '@change-dark/extension-settings'
import {
  CSSOM_WATCH_START_EVENT,
  CSSOM_WATCH_STOP_EVENT,
  OPEN_SHADOW_ATTACHED_EVENT,
  __flushShadowManagerForTests,
  __setShadowManagerIdleScheduleForTests,
  getRegisteredShadowRootCountForTests,
  getShadowRootRebuildCountForTests,
  startShadowRootManager,
  stopShadowRootManager,
} from '../shadow-root-manager'

const themeFilters = {
  brightness: 100,
  contrast: 100,
  sepia: 0,
  saturate: 100,
} as const

const budget = { maxNodes: 120, maxMs: 35 }
const darkTheme = resolveThemePalette('dark', 'rgb(10, 12, 14)', 'rgb(230, 230, 235)')

class FakeAdoptedSheet {
  ownerNode: Element | null = null
  constructor(public cssText = '') {}
  get cssRules(): CSSRuleList {
    if (!this.cssText.trim()) return [] as unknown as CSSRuleList
    return [{ cssText: this.cssText }] as unknown as CSSRuleList
  }
  insertRule(rule: string, index = 0): number {
    this.cssText = this.cssText ? `${this.cssText}\n${rule}` : rule
    return index
  }
  deleteRule(): void {
    this.cssText = ''
  }
  replaceSync(text: string): void {
    this.cssText = text
  }
  async replace(text: string): Promise<this> {
    this.cssText = text
    return this
  }
}

async function flushMicrotasksAndManager(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0))
  __flushShadowManagerForTests()
}

const origShadowStyleSheetsDesc = Object.getOwnPropertyDescriptor(
  ShadowRoot.prototype,
  'styleSheets',
)

describe('RFC 0037 Task 3 & 4 — ShadowRootManager', () => {
  beforeEach(() => {
    stopShadowRootManager()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.documentElement.removeAttribute(ROOT_ATTR)
    Object.defineProperty(document, 'adoptedStyleSheets', {
      configurable: true,
      writable: true,
      value: [],
    })
    Object.defineProperty(ShadowRoot.prototype, 'styleSheets', {
      configurable: true,
      get(this: ShadowRoot) {
        return Array.from(this.querySelectorAll('style')).map((el) => ({
          ownerNode: el,
          get cssRules() {
            const txt = (el.textContent ?? '').trim()
            return txt
              ? ([{ cssText: txt }] as unknown as CSSRuleList)
              : ([] as unknown as CSSRuleList)
          },
        }))
      },
    })
    __setShadowManagerIdleScheduleForTests((task) => task())
  })

  afterEach(() => {
    stopShadowRootManager()
    if (origShadowStyleSheetsDesc) {
      Object.defineProperty(
        ShadowRoot.prototype,
        'styleSheets',
        origShadowStyleSheetsDesc,
      )
    } else {
      delete (ShadowRoot.prototype as unknown as Record<string, unknown>)
        .styleSheets
    }
  })

  it('discovers initial & nested open ShadowRoots, injects isolated owned <style>', () => {
    const outer = document.createElement('div')
    document.body.appendChild(outer)
    const outerSr = outer.attachShadow({ mode: 'open' })
    const outerStyle = document.createElement('style')
    outerStyle.textContent = '.outer-card { background-color: #ffffff; }'
    outerSr.appendChild(outerStyle)

    const inner = document.createElement('div')
    outerSr.appendChild(inner)
    const innerSr = inner.attachShadow({ mode: 'open' })
    const innerStyle = document.createElement('style')
    innerStyle.textContent = '.inner-pill { background-color: #f5f5f5; }'
    innerSr.appendChild(innerStyle)

    startShadowRootManager({
      doc: document,
      themeFilters,
      budget,
      theme: darkTheme,
      onDocumentInvalidated: vi.fn(),
    })

    expect(getRegisteredShadowRootCountForTests()).toBe(2)
    expect(outerSr.querySelectorAll(`style[${SHADOW_STYLE_OWNED_ATTR}="1"]`)).toHaveLength(1)
    expect(innerSr.querySelectorAll(`style[${SHADOW_STYLE_OWNED_ATTR}="1"]`)).toHaveLength(1)
    expect(
      outerSr.querySelector(`style[${SHADOW_STYLE_OWNED_ATTR}="1"]`)?.textContent,
    ).toContain('.outer-card')
    expect(
      innerSr.querySelector(`style[${SHADOW_STYLE_OWNED_ATTR}="1"]`)?.textContent,
    ).toContain('.inner-pill')
  })

  it('registers runtime open shadow attachment once and deduplicates repeated notifications', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    startShadowRootManager({
      doc: document,
      themeFilters,
      budget,
      theme: darkTheme,
      onDocumentInvalidated: vi.fn(),
    })
    expect(getRegisteredShadowRootCountForTests()).toBe(0)

    const sr = host.attachShadow({ mode: 'open' })
    const st = document.createElement('style')
    st.textContent = '.rt-box { background-color: #fafafa; }'
    sr.appendChild(st)

    host.dispatchEvent(
      new CustomEvent(OPEN_SHADOW_ATTACHED_EVENT, {
        bubbles: true,
        composed: true,
      }),
    )
    host.dispatchEvent(
      new CustomEvent(OPEN_SHADOW_ATTACHED_EVENT, {
        bubbles: true,
        composed: true,
      }),
    )

    __flushShadowManagerForTests()

    expect(getRegisteredShadowRootCountForTests()).toBe(1)
    expect(getShadowRootRebuildCountForTests(sr)).toBe(1)
    expect(sr.querySelectorAll(`style[${SHADOW_STYLE_OWNED_ATTR}="1"]`)).toHaveLength(1)
  })

  it('isolates mutations to the mutated ShadowRoot without rebuilding unrelated roots or looping', async () => {
    const hostA = document.createElement('div')
    const hostB = document.createElement('div')
    document.body.append(hostA, hostB)

    const srA = hostA.attachShadow({ mode: 'open' })
    const styleA = document.createElement('style')
    styleA.textContent = '.box-a { background-color: #ffffff; }'
    srA.appendChild(styleA)

    const srB = hostB.attachShadow({ mode: 'open' })
    const styleB = document.createElement('style')
    styleB.textContent = '.box-b { background-color: #eeeeee; }'
    srB.appendChild(styleB)

    startShadowRootManager({
      doc: document,
      themeFilters,
      budget,
      theme: darkTheme,
      onDocumentInvalidated: vi.fn(),
    })

    expect(getShadowRootRebuildCountForTests(srA)).toBe(1)
    expect(getShadowRootRebuildCountForTests(srB)).toBe(1)

    styleA.textContent = '.box-a { background-color: #dddddd; color: #111111; }'
    await flushMicrotasksAndManager()

    expect(getShadowRootRebuildCountForTests(srA)).toBe(2)
    expect(getShadowRootRebuildCountForTests(srB)).toBe(1)

    // No infinite loop on subsequent idle ticks
    await flushMicrotasksAndManager()
    expect(getShadowRootRebuildCountForTests(srA)).toBe(2)
  })

  it('coalesces shared adopted sheet mutations across Document and ShadowRoots into one batch and cleans up cleanly', () => {
    const shared = new FakeAdoptedSheet('.shared { background-color: #ffffff; }')
    const sharedSheet = shared as unknown as CSSStyleSheet
    Object.defineProperty(document, 'adoptedStyleSheets', {
      configurable: true,
      writable: true,
      value: [sharedSheet],
    })

    const h1 = document.createElement('div')
    const h2 = document.createElement('div')
    document.body.append(h1, h2)
    const sr1 = h1.attachShadow({ mode: 'open' })
    const sr2 = h2.attachShadow({ mode: 'open' })
    Object.defineProperty(sr1, 'adoptedStyleSheets', {
      configurable: true,
      value: [sharedSheet],
    })
    Object.defineProperty(sr2, 'adoptedStyleSheets', {
      configurable: true,
      value: [sharedSheet],
    })

    const onDocumentInvalidated = vi.fn()
    const watchEvents: string[] = []
    document.addEventListener(CSSOM_WATCH_START_EVENT, () => watchEvents.push('start'))
    document.addEventListener(CSSOM_WATCH_STOP_EVENT, () => watchEvents.push('stop'))

    startShadowRootManager({
      doc: document,
      themeFilters,
      budget,
      theme: darkTheme,
      onDocumentInvalidated,
    })

    expect(watchEvents).toEqual(['start'])
    expect(getShadowRootRebuildCountForTests(sr1)).toBe(1)
    expect(getShadowRootRebuildCountForTests(sr2)).toBe(1)

    // Multiple rapid mutations coalesce into a single rebuild per consumer root
    shared.insertRule('.added-1 { background: #fafafa; }')
    shared.replaceSync('.shared { background-color: #f0f0f0; }')
    __flushShadowManagerForTests()

    expect(onDocumentInvalidated).toHaveBeenCalledTimes(1)
    expect(getShadowRootRebuildCountForTests(sr1)).toBe(2)
    expect(getShadowRootRebuildCountForTests(sr2)).toBe(2)
    expect(
      sr1.querySelector(`#${STYLE_ELEMENT_ID}`)?.getAttribute(SHADOW_STYLE_OWNED_ATTR),
    ).toBe('1')

    stopShadowRootManager()
    expect(watchEvents).toEqual(['start', 'stop'])
    expect(getRegisteredShadowRootCountForTests()).toBe(0)
    expect(sr1.querySelectorAll('style')).toHaveLength(0)
    expect(sr2.querySelectorAll('style')).toHaveLength(0)
    expect(shared.insertRule).toBe(FakeAdoptedSheet.prototype.insertRule)

    // Repeated start/stop leaves no duplicate nodes
    startShadowRootManager({
      doc: document,
      themeFilters,
      budget,
      theme: darkTheme,
      onDocumentInvalidated,
    })
    expect(sr1.querySelectorAll(`style[${SHADOW_STYLE_OWNED_ATTR}="1"]`)).toHaveLength(1)
    stopShadowRootManager()
    expect(sr1.querySelectorAll('style')).toHaveLength(0)
  })
})
