/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import {
  hasSurfaceComponentClassHint,
  isSignificantVisibleLightPanel,
  isSurfaceLandmark,
} from '../surface-heuristics'

describe('surface heuristics', () => {
  it('识别地标与组件 class 线索', () => {
    const main = document.createElement('main')
    expect(isSurfaceLandmark(main)).toBe(true)

    const footer = document.createElement('footer')
    footer.className = 'site-footer'
    expect(isSurfaceLandmark(footer)).toBe(true)

    const box = document.createElement('div')
    box.className = 'secondary-hero__text-box'
    expect(hasSurfaceComponentClassHint(box)).toBe(true)

    const grid = document.createElement('div')
    grid.className = 'h-c-page'
    expect(hasSurfaceComponentClassHint(grid)).toBe(false)
  })

  it('大面积视口内面板', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1200,
    })
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 800,
    })

    const panel = document.createElement('section')
    panel.style.backgroundColor = 'rgb(255, 255, 255)'
    panel.getBoundingClientRect = () =>
      ({
        width: 400,
        height: 300,
        top: 100,
        left: 100,
        right: 500,
        bottom: 400,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect
    document.body.appendChild(panel)
    expect(isSignificantVisibleLightPanel(panel)).toBe(true)

    const chip = document.createElement('div')
    chip.getBoundingClientRect = () =>
      ({
        width: 80,
        height: 30,
        top: 10,
        left: 10,
        right: 90,
        bottom: 40,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }) as DOMRect
    document.body.appendChild(chip)
    expect(isSignificantVisibleLightPanel(chip)).toBe(false)
  })
})
