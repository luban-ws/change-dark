import { test, expect } from './fixtures'
import {
  fixtureUrl,
  seedDynamicOn,
  waitForForcedDarkRoot,
} from './helpers/extension'

test.describe('RFC 0036 — CSS Variable Recolor Graph', () => {
  test('recolors neutral vars, alias chains, oklch, multi-use tokens, and preserves author vars & brand color', async ({
    context,
  }) => {
    await seedDynamicOn(context)
    const page = await context.newPage()
    await page.goto(fixtureUrl('css-variable-graph.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)
    await page.waitForTimeout(300)

    const result = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.backgroundColor = 'var(--cd-page-bg)'
      probe.style.color = 'var(--cd-page-fg)'
      document.body.appendChild(probe)
      const expectedBg = getComputedStyle(probe).backgroundColor
      const expectedFg = getComputedStyle(probe).color
      probe.remove()

      const bgOf = (sel: string): string => {
        const el = document.querySelector(sel)
        if (!el) throw new Error(`Missing element: ${sel}`)
        return getComputedStyle(el).backgroundColor
      }

      const colorOf = (sel: string): string => {
        const el = document.querySelector(sel)
        if (!el) throw new Error(`Missing element: ${sel}`)
        return getComputedStyle(el).color
      }

      const rootStyle = getComputedStyle(document.documentElement)
      const styleEl = document.getElementById('change-dark-style')

      return {
        expectedBg,
        expectedFg,
        panelBg: bgOf('.panel'),
        multiBg: bgOf('.multi-bg'),
        fallbackBg: bgOf('.fallback-panel'),
        aliasBg: bgOf('.alias-panel'),
        brandBg: bgOf('.brand-btn'),
        multiFg: colorOf('.multi-fg'),
        authorSurfaceVar: rootStyle.getPropertyValue('--surface').trim(),
        authorToneVar: rootStyle.getPropertyValue('--tone').trim(),
        styleText: styleEl?.textContent ?? '',
      }
    })

    expect(result.panelBg).toBe(result.expectedBg)
    expect(result.multiBg).toBe(result.expectedBg)
    expect(result.fallbackBg).toBe(result.expectedBg)
    expect(result.aliasBg).toBe(result.expectedBg)
    expect(result.multiFg).toBe(result.expectedFg)
    expect(result.brandBg).not.toBe(result.expectedBg)
    expect(result.authorSurfaceVar).toBe('#f0f0f0')
    expect(result.authorToneVar).toBe('#e8e8e8')
    expect(result.styleText).not.toContain('html[data-change-dark-root] :root')
  })
})
