import { describe, expect, it, vi } from 'vitest'

import { batchModifyColors, batchModifyColorsAsync } from '../modify-colors'

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

describe('batchModifyColorsAsync', () => {
  it('小批量走单次同步 WASM 快路径且结果与 batchModifyColors 一致', async () => {
    const engine = await import('@change-dark/dark-engine')
    const spy = vi.spyOn(engine, 'batchModifyColorRgb')
    const items = [
      { rgb: { r: 255, g: 255, b: 255 }, use: 'bg' as const },
      { rgb: { r: 20, g: 20, b: 20 }, use: 'fg' as const },
      { rgb: { r: 190, g: 190, b: 190 }, use: 'border' as const },
    ]
    const expected = batchModifyColors(items)
    spy.mockClear()

    const actual = await batchModifyColorsAsync(items)
    expect(actual).toEqual(expected)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('超出 chunkSize 时分块执行并在块间协作让出主线程', async () => {
    const engine = await import('@change-dark/dark-engine')
    const spy = vi.spyOn(engine, 'batchModifyColorRgb')
    const items = Array.from({ length: 10 }, (_, idx) => ({
      rgb: { r: 200 + idx, g: 150 + idx, b: 100 + idx },
      use: (idx % 3 === 0 ? 'bg' : idx % 3 === 1 ? 'fg' : 'border') as
        | 'bg'
        | 'fg'
        | 'border',
    }))
    const expected = batchModifyColors(items)
    spy.mockClear()

    const yieldSpy = vi.fn(() => Promise.resolve())
    const g = globalThis as { scheduler?: { yield?: () => Promise<void> } }
    const prevScheduler = g.scheduler
    g.scheduler = { yield: yieldSpy }
    try {
      const actual = await batchModifyColorsAsync(items, undefined, {
        chunkSize: 3,
      })
      expect(actual).toEqual(expected)
      expect(spy).toHaveBeenCalledTimes(4)
      expect(yieldSpy).toHaveBeenCalledTimes(3)
    } finally {
      g.scheduler = prevScheduler
      spy.mockRestore()
    }
  })

  it('已中止的 AbortSignal 立即拒绝且不触发 WASM', async () => {
    const engine = await import('@change-dark/dark-engine')
    const spy = vi.spyOn(engine, 'batchModifyColorRgb')
    const controller = new AbortController()
    controller.abort(new Error('cancelled by test'))

    await expect(
      batchModifyColorsAsync(
        [{ rgb: { r: 255, g: 255, b: 255 }, use: 'bg' }],
        undefined,
        { signal: controller.signal },
      ),
    ).rejects.toThrow('cancelled by test')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
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
