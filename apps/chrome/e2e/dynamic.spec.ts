import { test, expect } from './fixtures'
import {
  E2E_STORAGE,
  fixtureUrl,
  readExtensionStorageKey,
  readHtmlBackgroundLuma,
  readInjectedStyleText,
  seedDynamicOn,
  setExtensionStorage,
  waitForForcedDarkRoot,
  waitForNoForcedDarkRoot,
} from './helpers/extension'

test.describe('RFC 026 P0 — Dynamic-only E2E', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    void extensionId
    await seedDynamicOn(context)
  })

  test('P0-1 首屏铺底：ROOT_ATTR + html 背景变暗', async ({ context }) => {
    const page = await context.newPage()
    await page.goto(fixtureUrl('dynamic-light.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)

    const luma = await readHtmlBackgroundLuma(page)
    expect(luma).toBeLessThan(80)

    const css = await readInjectedStyleText(page)
    expect(css).toContain('--cd-page-bg')
    expect(css).toContain('color-scheme: dark')
  })

  test('P0-2 同源 CSS 改色：注入 !important 覆盖', async ({ context }) => {
    const page = await context.newPage()
    await page.goto(fixtureUrl('dynamic-same-origin-css.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)

    const css = await readInjectedStyleText(page)
    expect(css).toContain('!important')
    expect(css.length).toBeGreaterThan(200)
  })

  test('P0-3 无 readable CSS 仍铺底', async ({ context }) => {
    const page = await context.newPage()
    await page.goto(fixtureUrl('dynamic-light.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)

    const css = await readInjectedStyleText(page)
    expect(css).toContain('--cd-page-bg')
    expect(css).toContain('--cd-page-fg')
  })

  test('P0-4 晚到 stylesheet：MO 后仍保留 ROOT_ATTR', async ({ context }) => {
    const page = await context.newPage()
    await page.goto(fixtureUrl('dynamic-late-style.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page)
    await page.waitForTimeout(600)
    await expect(page.locator('html[data-change-dark-root]')).toHaveCount(1)
  })

  test('P0-5 Auto + 原生暗页：不注入', async ({ context }) => {
    await setExtensionStorage(context, { [E2E_STORAGE.POLICY]: 'auto' })
    const page = await context.newPage()
    await page.goto(fixtureUrl('native-dark-auto.html'), { waitUntil: 'load' })
    await page.waitForTimeout(800)
    await waitForNoForcedDarkRoot(page)
  })

  test('P0-6 Auto 阈值：边缘亮度受 threshold 影响', async ({ context }) => {
    await setExtensionStorage(context, {
      [E2E_STORAGE.POLICY]: 'auto',
      [E2E_STORAGE.AUTO_THRESHOLD]: 120,
    })
    const page = await context.newPage()
    await page.goto(fixtureUrl('threshold-edge.html'), { waitUntil: 'load' })
    await page.waitForTimeout(800)
    await waitForNoForcedDarkRoot(page)

    await setExtensionStorage(context, {
      [E2E_STORAGE.POLICY]: 'auto',
      [E2E_STORAGE.AUTO_THRESHOLD]: 80,
    })
    const page2 = await context.newPage()
    await page2.goto(fixtureUrl('threshold-edge.html'), { waitUntil: 'load' })
    await waitForForcedDarkRoot(page2)
  })
})

test.describe('RFC 026 — Popup policy 持久化', () => {
  test('切换 On 写入 storage', async ({ context, extensionId }) => {
    await seedDynamicOn(context)
    await setExtensionStorage(context, { [E2E_STORAGE.POLICY]: 'off' })

    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`)
    await page.getByText('On', { exact: true }).first().click()
    await page.waitForTimeout(300)

    const policy = await readExtensionStorageKey(context, E2E_STORAGE.POLICY)
    expect(policy).toBe('on')
  })
})
