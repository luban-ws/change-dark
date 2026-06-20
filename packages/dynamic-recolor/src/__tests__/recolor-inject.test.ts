import { describe, expect, it } from 'vitest'

import { CSS_VAR_PAGE_BG, ROOT_ATTR } from '@change-dark/extension-settings'

import { mergeRecolorStyleText } from '../recolor-inject'

describe('mergeRecolorStyleText', () => {
  it('主题壳排在 WASM 改色之后且覆盖 class 级改色', () => {
    const merged = mergeRecolorStyleText(
      `:root { ${CSS_VAR_PAGE_BG}: rgb(0, 43, 54); }`,
      `html[${ROOT_ATTR}] .h-c-header__bar { background-color: rgb(24, 26, 27) !important; }`,
    )
    const wasmIdx = merged.indexOf('rgb(24, 26, 27)')
    const shellIdx = merged.lastIndexOf('[class*="__bar"]')
    expect(wasmIdx).toBeGreaterThan(-1)
    expect(shellIdx).toBeGreaterThan(wasmIdx)
    expect(merged).toContain('html[data-change-dark-root] .h-c-header__bar')
    expect(merged).not.toContain(':where(')
  })
})
