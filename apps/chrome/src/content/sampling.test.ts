import { describe, expect, it } from 'vitest'

import { whenDocumentComplete, whenDomReady } from './sampling'

describe('whenDocumentComplete', () => {
  it('在 readyState 已为 complete 时立即 resolve', async () => {
    await expect(whenDocumentComplete()).resolves.toBeUndefined()
  })
})

describe('whenDomReady', () => {
  it('在 readyState 非 loading 时立即 resolve', async () => {
    await expect(whenDomReady()).resolves.toBeUndefined()
  })
})
