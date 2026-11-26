import { test, expect } from './fixtures'
import {
  E2E_STORAGE,
  fixtureUrl,
  seedDynamicOn,
  setExtensionStorage,
  waitForForcedDarkRoot,
  waitForNoForcedDarkRoot,
} from './helpers/extension'

type ColorStyleProp = 'backgroundColor' | 'borderLeftColor' | 'borderRightColor'

async function readElementColorLuma(
  page: import('@playwright/test').Page,
  selector: string,
  prop: ColorStyleProp,
): Promise<number> {
  return page.evaluate(
    ({ sel, styleProp }) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`Missing element: ${sel}`)
      const css = getComputedStyle(el)[styleProp]
      const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
      if (!m) return 255
      const r = +m[1]!
      const g = +m[2]!
      const b = +m[3]!
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    },
    { sel: selector, styleProp: prop },
  )
}

test.describe('RFC 0033 — Surface Repair Layer & GMP regression', () => {
  test('GMP layout: border gutter dark, hero bg-image preserved, transparent .h-c-page unpainted', async ({
    context,
  }) => {
    await seedDynamicOn(context)
    const page = await context.newPage()
    await page.goto(fixtureUrl('surface-repair-gmp.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)
    await page.waitForTimeout(300)

    const leftBorderLuma = await readElementColorLuma(page, '.gmp-page', 'borderLeftColor')
    const rightBorderLuma = await readElementColorLuma(page, '.gmp-page', 'borderRightColor')
    expect(leftBorderLuma).toBeLessThan(80)
    expect(rightBorderLuma).toBeLessThan(80)

    const heroState = await page.evaluate(() => {
      const el = document.querySelector('.hero-banner')
      if (!el) throw new Error('Missing .hero-banner')
      return {
        backgroundImage: getComputedStyle(el).backgroundImage,
        hasSurfaceFloor: el.hasAttribute('data-change-dark-surface-floor'),
      }
    })
    expect(heroState.backgroundImage).not.toBe('none')
    expect(heroState.hasSurfaceFloor).toBe(false)

    const pageShellState = await page.evaluate(() => {
      const el = document.querySelector('.h-c-page')
      if (!el) throw new Error('Missing .h-c-page')
      return {
        backgroundColor: getComputedStyle(el).backgroundColor,
        hasSurfaceFloor: el.hasAttribute('data-change-dark-surface-floor'),
      }
    })
    expect(pageShellState.hasSurfaceFloor).toBe(false)
    expect(pageShellState.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  })

  test('scroll resweep darkens below-the-fold section and footer', async ({ context }) => {
    await seedDynamicOn(context)
    const page = await context.newPage()
    await page.goto(fixtureUrl('surface-repair-gmp.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)
    await page.waitForTimeout(300)

    await page.evaluate(() => {
      document.querySelector('footer.site-footer')?.scrollIntoView()
    })
    await page.waitForTimeout(500)

    const sectionLuma = await readElementColorLuma(
      page,
      'section.below-fold-panel',
      'backgroundColor',
    )
    const footerLuma = await readElementColorLuma(page, 'footer.site-footer', 'backgroundColor')
    expect(sectionLuma).toBeLessThan(80)
    expect(footerLuma).toBeLessThan(80)
  })

  test('disabling policy clears surface floor and #change-dark-style', async ({ context }) => {
    await seedDynamicOn(context)
    const page = await context.newPage()
    await page.goto(fixtureUrl('surface-repair-gmp.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)
    await page.waitForTimeout(300)

    const bodyHasFloorWhileOn = await page.evaluate(() =>
      document.body.hasAttribute('data-change-dark-surface-floor'),
    )
    expect(bodyHasFloorWhileOn).toBe(true)

    await setExtensionStorage(context, { [E2E_STORAGE.POLICY]: 'off' })
    await waitForNoForcedDarkRoot(page)

    const clearedState = await page.evaluate(() => ({
      hasStyleEl: document.getElementById('change-dark-style') !== null,
      floorCount: document.querySelectorAll('[data-change-dark-surface-floor]').length,
    }))
    expect(clearedState.hasStyleEl).toBe(false)
    expect(clearedState.floorCount).toBe(0)

    const bodyLumaAfterOff = await readElementColorLuma(page, 'body', 'backgroundColor')
    expect(bodyLumaAfterOff).toBeGreaterThan(200)
  })
})
