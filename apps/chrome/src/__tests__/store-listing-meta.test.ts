import { describe, expect, it } from 'vitest'
import { CWS_SHORT_DESCRIPTION } from '../store-listing-meta'

describe('store-listing-meta', () => {
  it('keeps manifest description within Chrome Web Store 132-char limit', () => {
    expect(CWS_SHORT_DESCRIPTION.length).toBeLessThanOrEqual(132)
  })
})
