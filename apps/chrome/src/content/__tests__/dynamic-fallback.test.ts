import { describe, expect, it, vi } from 'vitest'

import { STATIC_FALLBACK_RGB } from '@change-dark/extension-settings'

import { resolveDynamicBaseRgbWithBranch } from '../dynamic-fallback'

vi.mock('../sampling', () => ({
  collectPageBackgroundRgbBuffer: vi.fn(),
}))

vi.mock('@change-dark/dark-engine', () => ({
  kMeansDarkerCentroid: vi.fn(() => new Uint8Array([10, 20, 30])),
  kMeansRgbCentroids: vi.fn(() => new Uint8Array([40, 50, 60, 0, 0, 0])),
}))

describe('RFC 029 §4.1 — Dynamic 回退分支诊断', () => {
  it('样本不足 → empty-buffer + STATIC_FALLBACK_RGB', async () => {
    const { collectPageBackgroundRgbBuffer } = await import('../sampling')
    vi.mocked(collectPageBackgroundRgbBuffer).mockReturnValue(new Uint8Array([1, 2, 3]))

    const out = resolveDynamicBaseRgbWithBranch({ maxMs: 50, maxNodes: 100 })
    expect(out.branch).toBe('empty-buffer')
    expect(Array.from(out.rgb)).toEqual(Array.from(STATIC_FALLBACK_RGB))
  })

  it('正常缓冲 → darker-centroid', async () => {
    const { collectPageBackgroundRgbBuffer } = await import('../sampling')
    vi.mocked(collectPageBackgroundRgbBuffer).mockReturnValue(
      new Uint8Array([0, 0, 0, 255, 255, 255]),
    )

    const out = resolveDynamicBaseRgbWithBranch({ maxMs: 50, maxNodes: 100 })
    expect(out.branch).toBe('darker-centroid')
    expect(Array.from(out.rgb)).toEqual([10, 20, 30])
  })
})
