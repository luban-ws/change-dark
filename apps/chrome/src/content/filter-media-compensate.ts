/**
 * RFC 013/014：Filter 模式媒体补偿 idle 扫描（内联 filter 兜底）。
 */

import {
  applyFilterMediaCompensationInDocument,
  type FilterMediaCompensationKind,
} from '@luban-ws/dark-shared'

import { scheduleIdleTask } from './sampling'

/** 首绘后对全页媒体写入补偿 filter。 */
export function scheduleFilterMediaCompensation(
  kind: FilterMediaCompensationKind,
  doc: Document = document,
): void {
  scheduleIdleTask(() => {
    applyFilterMediaCompensationInDocument(doc, kind)
  })
}
