import { describe, expect, it } from 'vitest'
import { CSS_VAR_PAGE_BG, CSS_VAR_PAGE_BORDER, CSS_VAR_PAGE_FG, ROOT_ATTR } from '@change-dark/extension-settings'
import { buildRecolorOverrideStylesheet } from '../css-stylesheet'
import {
  classifyLightDarkNeutralRole,
  parseLightDarkBranches,
  parseOklchNeutralLightness,
  recolorLightDarkToPaletteVar,
} from '../light-dark'

describe('parseLightDarkBranches', () => {
  it('parses hex and oklch branches', () => {
    expect(parseLightDarkBranches('light-dark(#fff, oklch(17% 0 0))')).toEqual({
      light: '#fff',
      dark: 'oklch(17% 0 0)',
    })
  })

  it('parses nested parens in oklch', () => {
    expect(
      parseLightDarkBranches('light-dark(oklch(98.5% 0 0), #000)'),
    ).toEqual({
      light: 'oklch(98.5% 0 0)',
      dark: '#000',
    })
  })

  it('returns null for non light-dark', () => {
    expect(parseLightDarkBranches('#fff')).toBeNull()
  })
})

describe('parseOklchNeutralLightness', () => {
  it('parses oklch neutral lightness proxy', () => {
    expect(parseOklchNeutralLightness('oklch(17% 0 0)')).toBeCloseTo(0.17, 2)
    expect(parseOklchNeutralLightness('oklch(98.5% 0 0)')).toBeCloseTo(0.985, 3)
  })
})

describe('classifyLightDarkNeutralRole', () => {
  it('detects surface tokens', () => {
    expect(
      classifyLightDarkNeutralRole('#fff', 'oklch(17% 0 0)'),
    ).toBe('surface')
    expect(classifyLightDarkNeutralRole('oklch(98.5% 0 0)', '#000')).toBe(
      'surface',
    )
  })

  it('detects line tokens', () => {
    expect(
      classifyLightDarkNeutralRole('#eee', 'oklch(35% 0 0)'),
    ).toBe('line')
  })

  it('detects text tokens', () => {
    expect(
      classifyLightDarkNeutralRole('#111', 'oklch(97% 0 0)'),
    ).toBe('text')
  })

  it('ignores saturated colors', () => {
    expect(classifyLightDarkNeutralRole('#f6821f', '#000')).toBeNull()
  })
})

describe('recolorLightDarkToPaletteVar', () => {
  it('binds surface light-dark to page bg var', () => {
    expect(recolorLightDarkToPaletteVar('light-dark(#fff, oklch(17% 0 0))')).toBe(
      `var(${CSS_VAR_PAGE_BG})`,
    )
  })

  it('binds line light-dark to page border var', () => {
    expect(
      recolorLightDarkToPaletteVar('light-dark(#eee, oklch(35% 0 0))'),
    ).toBe(`var(${CSS_VAR_PAGE_BORDER})`)
  })

  it('binds text light-dark to page fg var', () => {
    expect(
      recolorLightDarkToPaletteVar('light-dark(#111, oklch(97% 0 0))'),
    ).toBe(`var(${CSS_VAR_PAGE_FG})`)
  })
})

describe('buildRecolorOverrideStylesheet light-dark custom properties', () => {
  it('rewrites :root --* definitions that use light-dark()', () => {
    const css = `
      :root {
        --color-kumo-base: light-dark(#fff, oklch(17% 0 0));
        --color-bg-secondary: light-dark(oklch(98.5% 0 0), #000);
      }
      .bg-kumo-base { background-color: var(--color-kumo-base); }
    `
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(
      `--color-kumo-base: var(${CSS_VAR_PAGE_BG}) !important`,
    )
    expect(out).toContain(
      `--color-bg-secondary: var(${CSS_VAR_PAGE_BG}) !important`,
    )
    expect(out).not.toContain('light-dark(')
    expect(out).not.toContain('var(--color-kumo-base)')
  })

  it('prefixes selectors with html root attr', () => {
    const css = `:root { --x: light-dark(#fff, #111); }`
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(`html[${ROOT_ATTR}] {`)
    expect(out).not.toContain(`html[${ROOT_ATTR}] :root`)
  })
})
