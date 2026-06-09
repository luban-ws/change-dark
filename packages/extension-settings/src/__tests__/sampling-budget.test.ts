import { describe, expect, it, vi } from 'vitest'

import {
  STORAGE_KEY_SAMPLING_MAX_MS,
  STORAGE_KEY_SAMPLING_MAX_NODES,
} from '../constants'
import {
  clampInt,
  computeDeadlineMs,
  isPastDeadline,
  resolveSamplingBudgetFromSnapshot,
} from '../sampling-budget'

describe('clampInt', () => {
  it('非法回退', () => {
    expect(clampInt(undefined, 10, 1, 100)).toBe(10)
    expect(clampInt('x', 10, 1, 100)).toBe(10)
  })

  it('夹在区间内', () => {
    expect(clampInt(5, 10, 10, 100)).toBe(10)
    expect(clampInt(200, 10, 10, 100)).toBe(100)
    expect(clampInt(42.7, 10, 1, 100)).toBe(42)
  })
})

describe('resolveSamplingBudgetFromSnapshot', () => {
  it('使用默认值', () => {
    const b = resolveSamplingBudgetFromSnapshot({})
    expect(b.maxNodes).toBeGreaterThan(0)
    expect(b.maxMs).toBeGreaterThan(0)
  })

  it('读取 storage 覆盖', () => {
    const b = resolveSamplingBudgetFromSnapshot({
      [STORAGE_KEY_SAMPLING_MAX_NODES]: 80,
      [STORAGE_KEY_SAMPLING_MAX_MS]: 50,
    })
    expect(b.maxNodes).toBe(80)
    expect(b.maxMs).toBe(50)
  })
})

describe('deadline', () => {
  it('时间墙', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const d = computeDeadlineMs(Date.now(), 20)
    vi.setSystemTime(new Date('2026-01-01T00:00:00.019Z'))
    expect(isPastDeadline(Date.now(), d)).toBe(false)
    vi.setSystemTime(new Date('2026-01-01T00:00:00.020Z'))
    expect(isPastDeadline(Date.now(), d)).toBe(true)
    vi.useRealTimers()
  })
})
