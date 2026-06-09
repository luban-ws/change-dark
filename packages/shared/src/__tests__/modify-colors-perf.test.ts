import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import { batchModifyColors, modifyColor } from '../modify-colors'

/** 模拟重站：大量重复色 + 少量唯一色（去重缓存应命中）。 */
function buildHeavyPageColors(count: number) {
  const palette = [
    { rgb: { r: 255, g: 255, b: 255 }, use: 'bg' as const },
    { rgb: { r: 0, g: 0, b: 0 }, use: 'fg' as const },
    { rgb: { r: 51, g: 51, b: 51 }, use: 'fg' as const },
    { rgb: { r: 204, g: 204, b: 204 }, use: 'border' as const },
    { rgb: { r: 26, g: 115, b: 232 }, use: 'fg' as const },
    { rgb: { r: 240, g: 240, b: 240 }, use: 'bg' as const },
  ]
  return Array.from({ length: count }, (_, i) => palette[i % palette.length]!)
}

describe('RFC 031 §5.3 — 批改色性能回归', () => {
  it('批去重：重复输入与逐色 modifyColor 一致', () => {
    const item = { rgb: { r: 255, g: 255, b: 255 }, use: 'bg' as const }
    const repeated = Array.from({ length: 48 }, () => item)
    const batch = batchModifyColors(repeated)
    const scalar = repeated.map((i) => modifyColor(i.rgb, i.use))
    expect(batch).toEqual(scalar)
  })

  it('500 色：batchModifyColors 快于逐色 loop（一次 WASM 过桥）', () => {
    const items = buildHeavyPageColors(500)

    const tScalar0 = performance.now()
    for (const item of items) {
      modifyColor(item.rgb, item.use)
    }
    const scalarMs = performance.now() - tScalar0

    const tBatch0 = performance.now()
    const batch = batchModifyColors(items)
    const batchMs = performance.now() - tBatch0

    expect(batch).toHaveLength(500)
    // CI/本机抖动大：只要求批路径明显更快（通常 5×+）
    expect(batchMs).toBeLessThan(scalarMs)
  })
})
