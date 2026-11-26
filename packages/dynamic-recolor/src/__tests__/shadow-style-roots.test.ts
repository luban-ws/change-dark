/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_THEME_FILTERS,
  STYLE_ELEMENT_ID,
} from '@change-dark/extension-settings'
import { AdoptedStyleSheetTracker } from '../adopted-sheet-tracker'
import {
  buildRecolorOverrideStylesheet,
  formatShadowRecolorOverrideSelector,
} from '../css-stylesheet'
import {
  buildRecolorInjectionForRoot,
  ensureShadowStyleElement,
  removeShadowStyleElement,
} from '../recolor-inject'
import {
  SHADOW_STYLE_OWNED_ATTR,
  collectReadableStylesheetCssTexts,
  type StyleRoot,
} from '../stylesheet-collect'

class FakeConstructedSheet {
  ownerNode: Element | null
  lastThis: unknown = null

  constructor(
    public cssText = '',
    ownerNode: Element | null = null,
  ) {
    this.ownerNode = ownerNode
  }

  get cssRules(): CSSRuleList {
    if (!this.cssText.trim()) return [] as unknown as CSSRuleList
    return [{ cssText: this.cssText }] as unknown as CSSRuleList
  }

  insertRule(rule: string, index = 0): number {
    this.lastThis = this
    if (rule.includes('THROW_INVALID')) {
      throw new DOMException('Invalid rule', 'SyntaxError')
    }
    this.cssText = this.cssText ? `${this.cssText}\n${rule}` : rule
    return index
  }

  deleteRule(index: number): void {
    this.lastThis = this
    if (index < 0) {
      throw new DOMException('Out of bounds', 'IndexSizeError')
    }
    this.cssText = ''
  }

  replaceSync(text: string): void {
    this.lastThis = this
    this.cssText = text
  }

  async replace(text: string): Promise<this> {
    this.lastThis = this
    if (text.includes('REJECT_ASYNC')) {
      throw new Error('replace failed')
    }
    this.cssText = text
    return this
  }
}

function installShadowStyleSheetsShim(sr: ShadowRoot): void {
  Object.defineProperty(sr, 'styleSheets', {
    configurable: true,
    get() {
      return Array.from(sr.querySelectorAll('style')).map((el) => ({
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
}

describe('RFC 0037 Task 1 — collectReadableStylesheetCssTexts', () => {
  it('collects ShadowRoot styleSheets + adoptedStyleSheets, deduplicates identity, skips owned, isolates SecurityError', () => {
    const doc = document.implementation.createHTMLDocument('test')
    const host = doc.createElement('div')
    doc.body.appendChild(host)
    const sr = host.attachShadow({ mode: 'open' })

    const authorStyle = doc.createElement('style')
    authorStyle.textContent = '.shadow-card { background-color: rgb(255, 255, 255); }'
    sr.appendChild(authorStyle)

    const ownedShadowStyle = doc.createElement('style')
    ownedShadowStyle.id = STYLE_ELEMENT_ID
    ownedShadowStyle.setAttribute(SHADOW_STYLE_OWNED_ATTR, '1')
    ownedShadowStyle.textContent = '.should-ignore { color: #000; }'
    sr.appendChild(ownedShadowStyle)

    const docOwnedStyle = doc.createElement('style')
    docOwnedStyle.id = STYLE_ELEMENT_ID
    docOwnedStyle.textContent = '.doc-owned-ignore { color: #000; }'
    doc.head.appendChild(docOwnedStyle)

    const readableSheet = new FakeConstructedSheet(
      '.shadow-card { background-color: rgb(255, 255, 255); }',
      authorStyle,
    )
    const ownedShadowSheet = new FakeConstructedSheet(
      '.should-ignore { color: #000; }',
      ownedShadowStyle,
    )
    const docOwnedSheet = new FakeConstructedSheet(
      '.doc-owned-ignore { color: #000; }',
      docOwnedStyle,
    )
    const sharedSheet = new FakeConstructedSheet(
      '.adopted-box { background-color: #eeeeee; }',
    )
    const emptyAdoptedSheet = new FakeConstructedSheet('')
    const blockedSheet = {
      ownerNode: null,
      get cssRules() {
        throw new DOMException('Blocked', 'SecurityError')
      },
    } as unknown as CSSStyleSheet

    Object.defineProperty(sr, 'styleSheets', {
      configurable: true,
      value: [
        readableSheet as unknown as CSSStyleSheet,
        blockedSheet,
        ownedShadowSheet as unknown as CSSStyleSheet,
        sharedSheet as unknown as CSSStyleSheet,
      ],
    })
    Object.defineProperty(sr, 'adoptedStyleSheets', {
      configurable: true,
      value: [
        sharedSheet as unknown as CSSStyleSheet,
        emptyAdoptedSheet as unknown as CSSStyleSheet,
      ],
    })

    const res = collectReadableStylesheetCssTexts(sr)
    expect(res.failedSheetCount).toBe(1)
    expect(res.readableSheetCount).toBe(2)
    expect(res.adoptedSheets).toHaveLength(2)
    expect(res.cssChunks).toHaveLength(2)
    expect(res.cssChunks.join('\n')).toContain('.shadow-card')
    expect(res.cssChunks.join('\n')).toContain('.adopted-box')
    expect(res.cssChunks.join('\n')).not.toContain('.should-ignore')

    Object.defineProperty(doc, 'styleSheets', {
      configurable: true,
      value: [docOwnedSheet as unknown as CSSStyleSheet],
    })
    const docRes = collectReadableStylesheetCssTexts(doc)
    expect(docRes.cssChunks).toEqual([])
  })
})

describe('RFC 0037 Task 2 — shadow selectors & root-scoped injection/cleanup', () => {
  it('formats shadow selectors cleanly (:root -> :host, no html prefix, keyframes untouched)', () => {
    expect(formatShadowRecolorOverrideSelector(':root')).toBe(':host')
    expect(formatShadowRecolorOverrideSelector(':root.light')).toBe(':host.light')
    expect(formatShadowRecolorOverrideSelector(':root .card')).toBe(':host .card')
    expect(formatShadowRecolorOverrideSelector(':root, :host(.active)')).toBe(
      ':host, :host(.active)',
    )
    expect(formatShadowRecolorOverrideSelector('.card')).toBe('.card')
    expect(formatShadowRecolorOverrideSelector('50%')).toBe('50%')

    const css = `
      :root { --surface: #f5f5f5; }
      .panel { background-color: var(--surface); color: #222222; }
    `
    const out = buildRecolorOverrideStylesheet(css, undefined, {
      selectorMode: 'shadow',
    })
    expect(out).toContain(':host { --cd-recolor-bg--surface:')
    expect(out).toContain('.panel { background-color:')
    expect(out).not.toContain('html[data-change-dark-root]')
  })

  it('builds root injection and creates/removes ONLY owned shadow style element', () => {
    const doc = document.implementation.createHTMLDocument('shadow')
    const host = doc.createElement('div')
    doc.body.appendChild(host)
    const sr = host.attachShadow({ mode: 'open' })
    installShadowStyleSheetsShim(sr)

    const authorStyle = doc.createElement('style')
    authorStyle.textContent = '.card { background-color: #ffffff; }'
    sr.appendChild(authorStyle)

    const build = buildRecolorInjectionForRoot(sr, DEFAULT_THEME_FILTERS)
    expect(build.overrideCss).toContain('.card {')
    expect(build.overrideCss).not.toContain('html[data-change-dark-root]')

    const el = ensureShadowStyleElement(sr, build.overrideCss)
    expect(el).not.toBeNull()
    expect(el?.getAttribute(SHADOW_STYLE_OWNED_ATTR)).toBe('1')
    expect(sr.querySelectorAll('style')).toHaveLength(2)

    removeShadowStyleElement(sr)
    expect(sr.querySelectorAll('style')).toHaveLength(1)
    expect(sr.querySelector('style')).toBe(authorStyle)
  })
})

describe('RFC 0037 Task 4 — AdoptedStyleSheetTracker', () => {
  it('wraps shared constructed sheet with ref counting, preserves semantics/errors/promises, and restores descriptors', async () => {
    const doc = document.implementation.createHTMLDocument('shared')
    const h1 = doc.createElement('div')
    const h2 = doc.createElement('div')
    doc.body.append(h1, h2)
    const sr1 = h1.attachShadow({ mode: 'open' })
    const sr2 = h2.attachShadow({ mode: 'open' })

    const invalidated: Array<{ roots: StyleRoot[]; sheet: CSSStyleSheet }> = []
    const tracker = new AdoptedStyleSheetTracker((roots, sheet) => {
      invalidated.push({ roots: Array.from(roots), sheet })
    })

    const fake = new FakeConstructedSheet('.a { background: #fff; }')
    const customOwnFn = vi.fn(fake.replaceSync.bind(fake))
    Object.defineProperty(fake, 'replaceSync', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: customOwnFn,
    })

    const sheet = fake as unknown as CSSStyleSheet
    tracker.setRootSheets(doc, [sheet])
    tracker.setRootSheets(sr1, [sheet])
    tracker.setRootSheets(sr2, [sheet])

    expect(tracker.getRootsForSheet(sheet).size).toBe(3)
    expect(fake.insertRule).not.toBe(FakeConstructedSheet.prototype.insertRule)

    const idx = fake.insertRule('.b { color: #000; }', 1)
    expect(idx).toBe(1)
    expect(fake.lastThis).toBe(fake)
    expect(invalidated).toHaveLength(1)
    expect(new Set(invalidated[0]!.roots)).toEqual(new Set<StyleRoot>([doc, sr1, sr2]))

    expect(() => fake.insertRule('THROW_INVALID')).toThrow('Invalid rule')
    expect(invalidated).toHaveLength(1)

    fake.deleteRule(0)
    expect(invalidated).toHaveLength(2)

    fake.replaceSync('.c { background: #eee; }')
    expect(customOwnFn).toHaveBeenCalledWith('.c { background: #eee; }')
    expect(invalidated).toHaveLength(3)

    const resolved = await fake.replace('.d { background: #ddd; }')
    expect(resolved).toBe(fake)
    expect(invalidated).toHaveLength(4)

    await expect(fake.replace('REJECT_ASYNC')).rejects.toThrow('replace failed')
    expect(invalidated).toHaveLength(4)

    // Remove 1 consumer -> still wrapped because 2 remain
    tracker.removeRoot(sr1)
    expect(tracker.getRootsForSheet(sheet).size).toBe(2)
    expect(fake.insertRule).not.toBe(FakeConstructedSheet.prototype.insertRule)

    // Remove remaining consumers -> exact restoration
    tracker.removeRoot(doc)
    tracker.removeRoot(sr2)
    expect(tracker.getRootsForSheet(sheet).size).toBe(0)
    expect(Object.prototype.hasOwnProperty.call(fake, 'insertRule')).toBe(false)
    expect(fake.insertRule).toBe(FakeConstructedSheet.prototype.insertRule)
    expect(fake.replaceSync).toBe(customOwnFn)

    tracker.dispose()
  })

  it('reconcileAllTrackedSheets invalidates ONLY roots whose sheet snapshot changed', () => {
    const doc = document.implementation.createHTMLDocument('reconcile')
    const h1 = doc.createElement('div')
    const h2 = doc.createElement('div')
    doc.body.append(h1, h2)
    const sr1 = h1.attachShadow({ mode: 'open' })
    const sr2 = h2.attachShadow({ mode: 'open' })

    const tracker = new AdoptedStyleSheetTracker(() => {})
    const sheetA = new FakeConstructedSheet('.a { background: #fff; }')
    const sheetB = new FakeConstructedSheet('.b { background: #fafafa; }')

    tracker.setRootSheets(doc, [sheetA as unknown as CSSStyleSheet])
    tracker.setRootSheets(sr1, [sheetA as unknown as CSSStyleSheet])
    tracker.setRootSheets(sr2, [sheetB as unknown as CSSStyleSheet])

    expect(tracker.reconcileAllTrackedSheets().size).toBe(0)

    // Simulate external MAIN-world mutation bypassing isolated wrappers
    sheetA.cssText = '.a { background: #f0f0f0; } /* changed */'
    const dirty = tracker.reconcileAllTrackedSheets()
    expect(dirty).toEqual(new Set<StyleRoot>([doc, sr1]))
    expect(dirty.has(sr2)).toBe(false)

    // Second call with no further changes returns empty
    expect(tracker.reconcileAllTrackedSheets().size).toBe(0)

    tracker.dispose()
  })
})
