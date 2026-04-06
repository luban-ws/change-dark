import { describe, expect, it } from 'vitest'
import { BUY_ME_A_COFFEE_URL } from '../support-constants'

describe('support-constants', () => {
  it('pins Buy Me a Coffee page URL', () => {
    expect(BUY_ME_A_COFFEE_URL).toBe('https://buymeacoffee.com/ppvb0uo')
  })
})
