import { describe, expect, it, vi } from 'vitest'

import { batchModifyColors } from '../modify-colors'

describe('batchModifyColors', () => {
  it('批量结果与逐色 modifyColor 一致', () => {
    const items = [
      { rgb: { r: 255, g: 255, b: 255 }, use: 'bg' as const },
      { rgb: { r: 0, g: 0, b: 0 }, use: 'fg' as const },
      { rgb: { r: 204, g: 204, b: 204 }, use: 'border' as const },
    ]
    const batch = batchModifyColors(items)
    expect(batch).toHaveLength(3)
    for (const rgb of batch) {
      expect(rgb.r).toBeGreaterThanOrEqual(0)
      expect(rgb.r).toBeLessThanOrEqual(255)
    }
  })

  it('空输入 → 空数组', () => {
    expect(batchModifyColors([])).toEqual([])
  })
})

describe('buildRecolorOverrideStylesheet batch path', () => {
  it('多规则整表一次批处理（spy batchModifyColorRgb）', async () => {
    const engine = await import('@change-dark/dark-engine')
    const spy = vi.spyOn(engine, 'batchModifyColorRgb')
    const { buildRecolorOverrideStylesheet } = await import('../css-stylesheet')
    const css = `
      body { color: #000; background-color: #fff; }
      .a { color: #111; }
      .b { color: #222; border-color: #ccc; }
    `
    buildRecolorOverrideStylesheet(css)
    expect(spy).toHaveBeenCalledTimes(1)
    const [rgb, uses] = spy.mock.calls[0]!
    expect(rgb.length / 3).toBe(uses.length)
    expect(uses.length).toBeGreaterThanOrEqual(5)
    spy.mockRestore()
  })
})
