/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import {
  FILTER_CSS_INVERT_CHAIN,
  FILTER_MEDIA_FILTER_BACKUP_ATTR,
  FILTER_PLUS_SVG_FILTER_ID,
  FILTER_PLUS_SVG_HOST_ID,
} from '../constants'
import {
  applyFilterMediaCompensationElement,
  filterMediaCompensationFilterValue,
  restoreFilterMediaCompensationElement,
} from '../filter-media-compensate'

describe('filterMediaCompensationFilterValue', () => {
  it('css-invert 使用反相链', () => {
    expect(filterMediaCompensationFilterValue('css-invert')).toBe(
      FILTER_CSS_INVERT_CHAIN,
    )
  })

  it('filter-plus-svg 使用 url(#id)', () => {
    expect(filterMediaCompensationFilterValue('filter-plus-svg')).toBe(
      `url(#${FILTER_PLUS_SVG_FILTER_ID})`,
    )
  })
})

describe('applyFilterMediaCompensationElement', () => {
  it('img 写入补偿 filter 并备份', () => {
    const img = document.createElement('img')
    expect(applyFilterMediaCompensationElement(img, 'css-invert')).toBe(true)
    expect(img.style.filter).toContain('invert(1)')
    expect(img.getAttribute(FILTER_MEDIA_FILTER_BACKUP_ATTR)).toBe('')
    restoreFilterMediaCompensationElement(img)
    expect(img.style.filter).toBe('')
  })

  it('跳过 Filter+ SVG 宿主', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = FILTER_PLUS_SVG_HOST_ID
    expect(applyFilterMediaCompensationElement(svg as unknown as HTMLElement, 'css-invert')).toBe(false)
  })
})
