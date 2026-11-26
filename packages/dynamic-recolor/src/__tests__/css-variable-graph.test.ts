/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'

import {
  CSS_VAR_PAGE_BG,
  CSS_VAR_PAGE_BORDER,
  CSS_VAR_PAGE_FG,
  ROOT_ATTR,
} from '@change-dark/extension-settings'
import {
  buildRecolorOverrideStylesheet,
  collectRecolorOverrideRules,
  prefixRecolorOverrideSelector,
} from '../css-stylesheet'
import {
  buildCssVariableGraph,
  findTopLevelVarRefs,
  isUnsafeConstructiveVarValue,
  parseSingleVarExpression,
  wrapperVarName,
} from '../css-variable-graph'

describe('css variable expression parsers', () => {
  it('parses simple and nested var() expressions cleanly', () => {
    expect(parseSingleVarExpression('var(--surface)')).toEqual({
      name: '--surface',
      fallback: undefined,
      start: 0,
      end: 14,
    })
    expect(parseSingleVarExpression('var(--unset, var(--bg, #fff))')).toEqual({
      name: '--unset',
      fallback: 'var(--bg, #fff)',
      start: 0,
      end: 29,
    })
    expect(parseSingleVarExpression('1px solid var(--border)')).toBeNull()
  })

  it('finds top-level var() refs and flags constructive color expressions', () => {
    expect(
      findTopLevelVarRefs('var(--bw) solid var(--line)').map((r) => r.name),
    ).toEqual(['--bw', '--line'])

    expect(isUnsafeConstructiveVarValue('var(--a, var(--b))')).toBe(false)
    expect(isUnsafeConstructiveVarValue('1px solid var(--line)')).toBe(false)
    expect(
      isUnsafeConstructiveVarValue('rgb(var(--r), var(--g), var(--b))'),
    ).toBe(true)
    expect(
      isUnsafeConstructiveVarValue('color-mix(in srgb, var(--bg) 80%, #000)'),
    ).toBe(true)
  })
})

describe('RFC 0036 S0 — buildCssVariableGraph', () => {
  it('tracks nodes, dependency edges, multi-use sets, and late definitions', () => {
    const css = `
      .card { background-color: var(--alias-bg); }
      .copy { color: var(--tone); }
      .chip { background-color: var(--tone); border-color: var(--tone); }
      :root {
        --alias-bg: var(--surface);
        --surface: #f5f5f5;
        --tone: #e8e8e8;
      }
    `
    const graph = buildCssVariableGraph(css)

    const aliasNode = graph.nodes.get('--alias-bg')
    const surfaceNode = graph.nodes.get('--surface')
    const toneNode = graph.nodes.get('--tone')

    expect(aliasNode?.dependencies.has('--surface')).toBe(true)
    expect(surfaceNode?.dependents.has('--alias-bg')).toBe(true)
    expect(surfaceNode?.uses.has('bg')).toBe(true)
    expect(surfaceNode?.isResolvableColor).toBe(true)
    expect(aliasNode?.isResolvableColor).toBe(true)

    expect([...(toneNode?.uses ?? [])].sort()).toEqual(['bg', 'border', 'fg'])
    expect(toneNode?.isResolvableColor).toBe(true)
  })

  it('detects direct and mutual cycles and tracks constructive / light-dark nodes', () => {
    const css = `
      :root {
        --self: var(--self);
        --cyc-a: var(--cyc-b);
        --cyc-b: var(--cyc-a);
        --kumo-bg: light-dark(#fff, #111);
        --rgb-parts: rgb(var(--r), var(--g), var(--b));
      }
      .a { background: var(--self); }
      .b { color: var(--cyc-a); }
      .c { background: var(--kumo-bg); }
      .d { background: color-mix(in srgb, var(--self) 50%, #fff); }
    `
    const graph = buildCssVariableGraph(css)

    expect(graph.nodes.get('--self')?.isCyclic).toBe(true)
    expect(graph.nodes.get('--self')?.isResolvableColor).toBe(false)
    expect(graph.nodes.get('--cyc-a')?.isCyclic).toBe(true)
    expect(graph.nodes.get('--cyc-b')?.isCyclic).toBe(true)
    expect(graph.lightDarkVariables.has('--kumo-bg')).toBe(true)
    expect(graph.stats.skippedCyclic).toBe(3)
    expect(graph.stats.skippedConstructive).toBe(2)
  })

  it('honors deterministic maxMs SamplingBudget cutoff', () => {
    const manyRules = Array.from(
      { length: 140 },
      (_, i) => `.c${i} { --v${i}: #f0f0f0; background: var(--v${i}); }`,
    ).join('\n')

    let tick = 0
    const fakeNow = (): number => {
      const cur = tick
      tick += 10
      return cur
    }

    const graph = buildCssVariableGraph(manyRules, {
      maxMs: 5,
      now: fakeNow,
    })
    expect(graph.stats.budgetExceeded).toBe(true)
    expect(graph.nodes.size).toBeGreaterThan(0)
    expect(graph.nodes.size).toBeLessThan(140)
  })
})

describe('RFC 0036 S1/S2 — stylesheet rewrite & Acceptance #1–#6', () => {
  it('rewrites neutral surface vars to private wrappers, preserves author var, and avoids html :root', () => {
    const css = `
      :root { --surface: #f0f0f0; }
      .panel { background-color: var(--surface); }
    `
    const out = buildRecolorOverrideStylesheet(css)

    expect(out).toContain(
      `${wrapperVarName('--surface', 'bg')}: var(${CSS_VAR_PAGE_BG}) !important`,
    )
    expect(out).toContain(
      `background-color: var(${wrapperVarName('--surface', 'bg')}) !important`,
    )
    expect(out).toContain(`html[${ROOT_ATTR}] {`)
    expect(out).not.toContain(`html[${ROOT_ATTR}] :root`)
    expect(out).not.toMatch(/(?:^|[\s{;])--surface\s*:/)
  })

  it('prefixes html / html[data-theme] / :root.light selectors without descendant html or :root', () => {
    expect(prefixRecolorOverrideSelector('html')).toBe(`html[${ROOT_ATTR}]`)
    expect(prefixRecolorOverrideSelector('html[data-theme="light"]')).toBe(
      `html[${ROOT_ATTR}][data-theme="light"]`,
    )
    expect(prefixRecolorOverrideSelector(':root.light')).toBe(
      `html[${ROOT_ATTR}].light`,
    )
    expect(prefixRecolorOverrideSelector('html body')).toBe(
      `html[${ROOT_ATTR}] body`,
    )
  })

  it('supports oklch() and space-separated rgb() definitions as page bg tokens', () => {
    const css = `
      :root {
        --oklch-bg: oklch(0.96 0 0);
        --space-bg: rgb(245 245 245);
      }
      .a { background-color: var(--oklch-bg); }
      .b { background: var(--space-bg); }
    `
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(
      `${wrapperVarName('--oklch-bg', 'bg')}: var(${CSS_VAR_PAGE_BG}) !important`,
    )
    expect(out).toContain(
      `${wrapperVarName('--space-bg', 'bg')}: var(${CSS_VAR_PAGE_BG}) !important`,
    )
  })

  it('recolors high-chroma brand vars via WASM without binding to --cd-page-bg', () => {
    const css = `
      :root { --brand: #1a73e8; }
      .btn { background-color: var(--brand); }
    `
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(`${wrapperVarName('--brand', 'bg')}: #`)
    expect(out).not.toContain(
      `${wrapperVarName('--brand', 'bg')}: var(${CSS_VAR_PAGE_BG})`,
    )
    expect(out).toContain(
      `background-color: var(${wrapperVarName('--brand', 'bg')}) !important`,
    )
  })

  it('splits multi-use author variable independently into bg, fg, and border wrappers', () => {
    const css = `
      :root { --tone: #f0f0f0; }
      .box { background-color: var(--tone); }
      .label { color: var(--tone); }
      .line { border-color: var(--tone); }
    `
    const out = buildRecolorOverrideStylesheet(css)
    expect(out).toContain(
      `${wrapperVarName('--tone', 'bg')}: var(${CSS_VAR_PAGE_BG}) !important`,
    )
    expect(out).toContain(
      `${wrapperVarName('--tone', 'fg')}: var(${CSS_VAR_PAGE_FG}) !important`,
    )
    expect(out).toContain(
      `${wrapperVarName('--tone', 'border')}: var(${CSS_VAR_PAGE_BORDER}) !important`,
    )
    expect(out).toContain(
      `background-color: var(${wrapperVarName('--tone', 'bg')}) !important`,
    )
    expect(out).toContain(
      `color: var(${wrapperVarName('--tone', 'fg')}) !important`,
    )
    expect(out).toContain(
      `border-color: var(${wrapperVarName('--tone', 'border')}) !important`,
    )
  })

  it('rewrites chained aliases, nested var fallbacks, literal fallbacks, border shorthands, and skips cycles/unknowns', () => {
    const css = `
      :root {
        --base: #f5f5f5;
        --alias: var(--base);
        --line: #d4d4d4;
        --cyc-a: var(--cyc-b);
        --cyc-b: var(--cyc-a);
      }
      .chained { background-color: var(--alias); }
      .nested-fb { background-color: var(--missing, var(--base)); }
      .literal-fb { background-color: var(--missing2, #f0f0f0); }
      .framed { border: 1px solid var(--line); }
      .broken-cyc { background-color: var(--cyc-a); }
      .broken-unknown { color: var(--never-defined); }
    `
    const out = buildRecolorOverrideStylesheet(css)

    expect(out).toContain(
      `${wrapperVarName('--alias', 'bg')}: var(${wrapperVarName('--base', 'bg')}) !important`,
    )
    expect(out).toContain(
      `background-color: var(${wrapperVarName('--missing', 'bg')}, var(${wrapperVarName('--base', 'bg')})) !important`,
    )
    expect(out).toContain(
      `background-color: var(${wrapperVarName('--missing2', 'bg')}, var(${CSS_VAR_PAGE_BG})) !important`,
    )
    expect(out).toContain(
      `border: 1px solid var(${wrapperVarName('--line', 'border')}) !important`,
    )

    expect(out).not.toContain('.broken-cyc')
    expect(out).not.toContain('.broken-unknown')
    expect(out).not.toContain('--cyc-a')
  })

  it('lets RFC 0034 cssVarSubstitute win over generic variable graph on matching consumers', () => {
    const css = `
      :root { --brand-surface: #eeeeee; }
      .hero { background: var(--brand-surface); }
    `
    const out = buildRecolorOverrideStylesheet(css, undefined, {
      cssVarSubstitute: {
        '--brand-surface': { use: 'bg', fallback: 'var(--cd-custom-bg)' },
      },
    })
    expect(out).toContain('background: var(--cd-custom-bg) !important')
  })

  it('emits valid DOM-matching selectors verified with document.querySelectorAll in jsdom', () => {
    document.documentElement.setAttribute(ROOT_ATTR, '')
    document.body.innerHTML = '<main class="card"><span class="txt">hi</span></main>'

    const css = `
      :root { --bg: #fafafa; --fg: #222222; }
      .card { background-color: var(--bg); }
      .txt { color: var(--fg); }
    `
    const rules = collectRecolorOverrideRules(css)
    expect(rules.length).toBeGreaterThanOrEqual(3)
    for (const rule of rules) {
      const selector = prefixRecolorOverrideSelector(rule.selector)
      expect(document.querySelectorAll(selector).length).toBeGreaterThan(0)
    }

    document.documentElement.removeAttribute(ROOT_ATTR)
    document.body.innerHTML = ''
  })
})
