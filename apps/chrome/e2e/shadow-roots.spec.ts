import { test, expect } from './fixtures'
import {
  E2E_STORAGE,
  fixtureUrl,
  seedDynamicOn,
  setExtensionStorage,
  waitForForcedDarkRoot,
  waitForNoForcedDarkRoot,
} from './helpers/extension'

test.describe('RFC 0037 — Open Shadow DOM & adoptedStyleSheets Dynamic Recolor', () => {
  test('recolors initial/runtime/mutated open ShadowRoots, shared adoptedStyleSheets CSSOM mutations, and restores native methods on disable', async ({
    context,
  }) => {
    await seedDynamicOn(context)
    const page = await context.newPage()
    await page.goto(fixtureUrl('shadow-roots.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)

    const readExpectedPalette = async () =>
      page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.backgroundColor = 'var(--cd-page-bg)'
        probe.style.color = 'var(--cd-page-fg)'
        document.body.appendChild(probe)
        const expectedBg = getComputedStyle(probe).backgroundColor
        const expectedFg = getComputedStyle(probe).color
        probe.remove()
        return { expectedBg, expectedFg }
      })

    const { expectedBg, expectedFg } = await readExpectedPalette()

    // Acceptance #2: Initial open ShadowRoot + isolated owned style
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const sr = document.getElementById('host-initial')?.shadowRoot
          const card = sr?.querySelector('.shadow-card')
          const owned = sr?.querySelectorAll('style[data-change-dark-owned="1"]')
          return {
            bg: card ? getComputedStyle(card).backgroundColor : '',
            fg: card ? getComputedStyle(card).color : '',
            ownedCount: owned?.length ?? 0,
            docHasShadowRule: (
              document.getElementById('change-dark-style')?.textContent ?? ''
            ).includes('.shadow-card'),
          }
        }),
      )
      .toEqual({
        bg: expectedBg,
        fg: expectedFg,
        ownedCount: 1,
        docHasShadowRule: false,
      })

    // Acceptance #3: Runtime attachShadow({ mode: 'open' }) + duplicate event dedup
    await page.evaluate(() => {
      ;(
        window as unknown as {
          __testShadowApi: { attachRuntimeShadow: (dup: boolean) => void }
        }
      ).__testShadowApi.attachRuntimeShadow(true)
    })

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const sr = document.getElementById('host-runtime')?.shadowRoot
          const card = sr?.querySelector('.runtime-card')
          return {
            bg: card ? getComputedStyle(card).backgroundColor : '',
            ownedCount:
              sr?.querySelectorAll('style[data-change-dark-owned="1"]').length ?? 0,
          }
        }),
      )
      .toEqual({
        bg: expectedBg,
        ownedCount: 1,
      })

    // Acceptance #4: Root-local <style> append updates only that ShadowRoot without infinite loop
    await page.evaluate(() => {
      ;(
        window as unknown as {
          __testShadowApi: { appendStyleToInitialShadow: () => void }
        }
      ).__testShadowApi.appendStyleToInitialShadow()
    })

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const sr = document.getElementById('host-initial')?.shadowRoot
          const added = sr?.querySelector('.shadow-added')
          return {
            bg: added ? getComputedStyle(added).backgroundColor : '',
            ownedCount:
              sr?.querySelectorAll('style[data-change-dark-owned="1"]').length ?? 0,
          }
        }),
      )
      .toEqual({
        bg: expectedBg,
        ownedCount: 1,
      })

    // Acceptance #5: Shared constructed CSSStyleSheet across document + 2 ShadowRoots
    // 5a: Initial shared sheet rules active across doc, host-shared-1, host-shared-2
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          docBg: getComputedStyle(document.getElementById('doc-shared')!)
            .backgroundColor,
          s1Bg: getComputedStyle(
            document
              .getElementById('host-shared-1')!
              .shadowRoot!.querySelector('.shared-box')!,
          ).backgroundColor,
          s2Bg: getComputedStyle(
            document
              .getElementById('host-shared-2')!
              .shadowRoot!.querySelector('.shared-box')!,
          ).backgroundColor,
        })),
      )
      .toEqual({ docBg: expectedBg, s1Bg: expectedBg, s2Bg: expectedBg })

    // 5b: insertRule in MAIN world updates all 3 roots
    await page.evaluate(() => {
      ;(
        window as unknown as {
          __testShadowApi: { insertSharedRule: (r: string) => number }
        }
      ).__testShadowApi.insertSharedRule('.temp-box { background-color: #f4f4f4; }')
    })

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          docTempBg: getComputedStyle(document.getElementById('doc-temp')!)
            .backgroundColor,
          s1TempBg: getComputedStyle(
            document
              .getElementById('host-shared-1')!
              .shadowRoot!.querySelector('.temp-box')!,
          ).backgroundColor,
          s2TempBg: getComputedStyle(
            document
              .getElementById('host-shared-2')!
              .shadowRoot!.querySelector('.temp-box')!,
          ).backgroundColor,
        })),
      )
      .toEqual({
        docTempBg: expectedBg,
        s1TempBg: expectedBg,
        s2TempBg: expectedBg,
      })

    // 5c: deleteRule in MAIN world removes override for .temp-box across all 3 roots
    await page.evaluate(() => {
      ;(
        window as unknown as {
          __testShadowApi: { deleteLastSharedRule: () => void }
        }
      ).__testShadowApi.deleteLastSharedRule()
    })

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          s1TempBg: getComputedStyle(
            document
              .getElementById('host-shared-1')!
              .shadowRoot!.querySelector('.temp-box')!,
          ).backgroundColor,
          s2TempBg: getComputedStyle(
            document
              .getElementById('host-shared-2')!
              .shadowRoot!.querySelector('.temp-box')!,
          ).backgroundColor,
        })),
      )
      .toEqual({
        s1TempBg: 'rgba(0, 0, 0, 0)',
        s2TempBg: 'rgba(0, 0, 0, 0)',
      })

    // 5d: replaceSync and async replace() in MAIN world
    await page.evaluate(() => {
      ;(
        window as unknown as {
          __testShadowApi: { replaceSharedSync: (css: string) => void }
        }
      ).__testShadowApi.replaceSharedSync(
        '.shared-box { display: inline-block; width: 40px; height: 20px; background-color: #f9f9f9; }',
      )
    })

    await expect
      .poll(async () =>
        page.evaluate(() =>
          getComputedStyle(
            document
              .getElementById('host-shared-1')!
              .shadowRoot!.querySelector('.shared-box')!,
          ).backgroundColor,
        ),
      )
      .toBe(expectedBg)

    await page.evaluate(async () => {
      await (
        window as unknown as {
          __testShadowApi: { replaceSharedAsync: (css: string) => Promise<void> }
        }
      ).__testShadowApi.replaceSharedAsync(
        '.shared-box { display: inline-block; width: 40px; height: 20px; background-color: #ededed; color: #222222; }',
      )
    })

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          s1Bg: getComputedStyle(
            document
              .getElementById('host-shared-1')!
              .shadowRoot!.querySelector('.shared-box')!,
          ).backgroundColor,
          s2Fg: getComputedStyle(
            document
              .getElementById('host-shared-2')!
              .shadowRoot!.querySelector('.shared-box')!,
          ).color,
        })),
      )
      .toEqual({ s1Bg: expectedBg, s2Fg: expectedFg })

    // Acceptance #7: Disabling Dynamic removes document + ALL shadow styles & restores native CSSStyleSheet methods
    await setExtensionStorage(context, { [E2E_STORAGE.POLICY]: 'off' })
    await waitForNoForcedDarkRoot(page)

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const checkOwnedCount = (id: string) =>
            document
              .getElementById(id)
              ?.shadowRoot?.querySelectorAll(
                'style[data-change-dark-owned="1"], style#change-dark-style',
              ).length ?? 0

          return {
            docStyle: document.getElementById('change-dark-style') !== null,
            initialOwned: checkOwnedCount('host-initial'),
            runtimeOwned: checkOwnedCount('host-runtime'),
            shared1Owned: checkOwnedCount('host-shared-1'),
            shared2Owned: checkOwnedCount('host-shared-2'),
            insertRuleSrc: (
              window as unknown as {
                __testShadowApi: { getInsertRuleSource: () => string }
              }
            ).__testShadowApi.getInsertRuleSource(),
          }
        }),
      )
      .toEqual({
        docStyle: false,
        initialOwned: 0,
        runtimeOwned: 0,
        shared1Owned: 0,
        shared2Owned: 0,
        insertRuleSrc: expect.stringContaining('[native code]'),
      })

    // Re-enabling works cleanly with zero duplicate owned styles
    await setExtensionStorage(context, { [E2E_STORAGE.POLICY]: 'on' })
    await waitForForcedDarkRoot(page)

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const checkOwnedCount = (id: string) =>
            document
              .getElementById(id)
              ?.shadowRoot?.querySelectorAll('style[data-change-dark-owned="1"]')
              .length ?? 0
          return {
            initialOwned: checkOwnedCount('host-initial'),
            runtimeOwned: checkOwnedCount('host-runtime'),
            shared1Owned: checkOwnedCount('host-shared-1'),
            shared2Owned: checkOwnedCount('host-shared-2'),
          }
        }),
      )
      .toEqual({
        initialOwned: 1,
        runtimeOwned: 1,
        shared1Owned: 1,
        shared2Owned: 1,
      })
  })
})
