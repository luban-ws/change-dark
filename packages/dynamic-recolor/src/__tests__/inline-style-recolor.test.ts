/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'

import { INLINE_STYLE_BACKUP_ATTR } from '@luban-ws/extension-settings'
import { parseCssColorToken } from '../color-parse'
import {
  recolorElementInlineStyle,
  recolorInlineStylesInDocument,
  restoreInlineStylesInDocument,
} from '../inline-style-recolor'
import { modifyColor } from '../modify-colors'

describe('RFC 031 P1-3 — 内联 element.style 改色', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    restoreInlineStylesInDocument(document)
  })

  it('recolorElementInlineStyle 改写 color 并备份原始 style', () => {
    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    expect(recolorElementInlineStyle(p)).toBe(true)
    expect(p.getAttribute(INLINE_STYLE_BACKUP_ATTR)).toBe('color:#000')

    const applied = parseCssColorToken(p.style.getPropertyValue('color'))
    expect(applied).toEqual(modifyColor({ r: 0, g: 0, b: 0 }, 'fg'))
  })

  it('recolorInlineStylesInDocument 扫描子树', () => {
    const a = document.createElement('span')
    a.setAttribute('style', 'color:#000')
    const b = document.createElement('div')
    b.setAttribute('style', 'background-color:#fff')
    document.body.append(a, b)

    const { elementsRecolored, elementsScanned } = recolorInlineStylesInDocument(document)
    expect(elementsScanned).toBe(2)
    expect(elementsRecolored).toBe(2)
  })

  it('restoreInlineStylesInDocument 从备份还原', () => {
    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    recolorElementInlineStyle(p)
    expect(p.style.getPropertyValue('color')).not.toBe('rgb(0, 0, 0)')

    expect(restoreInlineStylesInDocument(document)).toBe(1)
    expect(p.getAttribute('style')).toBe('color:#000')
    expect(p.hasAttribute(INLINE_STYLE_BACKUP_ATTR)).toBe(false)
  })

  it('重复改色从备份源色计算，结果 idempotent', () => {
    const p = document.createElement('p')
    p.setAttribute('style', 'color:#000')
    document.body.appendChild(p)

    recolorElementInlineStyle(p)
    const first = p.style.getPropertyValue('color')
    recolorElementInlineStyle(p)
    expect(p.style.getPropertyValue('color')).toBe(first)
  })
})
