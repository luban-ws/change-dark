import {
  DEFAULT_SAMPLING_MAX_MS,
  DEFAULT_SAMPLING_MAX_NODES,
  STORAGE_KEY_SAMPLING_MAX_MS,
  STORAGE_KEY_SAMPLING_MAX_NODES,
} from './constants'

/** RFC 006：单次采样预算（可由 storage 覆盖）。 */
export interface SamplingBudget {
  maxNodes: number
  maxMs: number
}

/**
 * 将存储值解析为合法整数并夹在 `[min, max]`；非法时使用 `fallback`。
 */
export function clampInt(unknown: unknown, fallback: number, min: number, max: number): number {
  const n = typeof unknown === 'number' ? unknown : Number(unknown)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

/**
 * 由 `chrome.storage.local.get` 快照得到 `SamplingBudget`（纯函数，可单测）。
 */
export function resolveSamplingBudgetFromSnapshot(snapshot: Record<string, unknown>): SamplingBudget {
  return {
    maxNodes: clampInt(
      snapshot[STORAGE_KEY_SAMPLING_MAX_NODES],
      DEFAULT_SAMPLING_MAX_NODES,
      1,
      50_000,
    ),
    maxMs: clampInt(snapshot[STORAGE_KEY_SAMPLING_MAX_MS], DEFAULT_SAMPLING_MAX_MS, 1, 10_000),
  }
}

/**
 * 时间墙：`now >= deadline` 视为超预算（与 RFC 006 一致）。
 */
export function computeDeadlineMs(nowMs: number, maxMs: number): number {
  return nowMs + maxMs
}

export function isPastDeadline(nowMs: number, deadlineMs: number): boolean {
  return nowMs >= deadlineMs
}
