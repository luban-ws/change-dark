/**
 * RFC 029 §4 / RFC 031 §3.1：Dynamic 采样单色回退 — 基色解析与分支诊断。
 */
import {
  kMeansDarkerCentroid,
  kMeansRgbCentroids,
} from '@change-dark/dark-engine'

import { STATIC_FALLBACK_RGB, type SamplingBudget } from '@change-dark/extension-settings'

import { collectPageBackgroundRgbBuffer } from './sampling'

/** 回退层聚合分支（RFC 029 §4.1 分层诊断）。 */
export type DynamicFallbackBranch =
  | 'darker-centroid'
  | 'k-means-k1'
  | 'static-fallback'
  | 'empty-buffer'

export interface DynamicFallbackBaseRgbResult {
  rgb: Uint8Array
  branch: DynamicFallbackBranch
}

/**
 * 从页面背景采样缓冲解析 Dynamic 回退基色。
 * 供 `paintSampledFallbackPath` 与 debug 诊断共用。
 */
export function resolveDynamicBaseRgbWithBranch(
  budget: SamplingBudget,
  now: () => number = Date.now,
): DynamicFallbackBaseRgbResult {
  try {
    const buffer = collectPageBackgroundRgbBuffer(budget, now)
    if (buffer.length < 6) {
      return { rgb: new Uint8Array(STATIC_FALLBACK_RGB), branch: 'empty-buffer' }
    }
    try {
      return {
        rgb: new Uint8Array(kMeansDarkerCentroid(buffer, 40)),
        branch: 'darker-centroid',
      }
    } catch {
      try {
        return {
          rgb: kMeansRgbCentroids(buffer, 1, 40).subarray(0, 3),
          branch: 'k-means-k1',
        }
      } catch {
        return { rgb: new Uint8Array(STATIC_FALLBACK_RGB), branch: 'static-fallback' }
      }
    }
  } catch {
    return { rgb: new Uint8Array(STATIC_FALLBACK_RGB), branch: 'static-fallback' }
  }
}

/** @deprecated 使用 `resolveDynamicBaseRgbWithBranch`；保留旧签名供调用方迁移。 */
export function resolveDynamicBaseRgb(budget: SamplingBudget): Uint8Array {
  return resolveDynamicBaseRgbWithBranch(budget).rgb
}
