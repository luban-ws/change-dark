import type { BrowserContext } from '@playwright/test'

const FIXTURE_PORT = Number(process.env.E2E_FIXTURE_PORT ?? 4173)

/** 等待 MV3 扩展 background service worker 并返回 extension id。 */
export async function resolveExtensionServiceWorker(context: BrowserContext): Promise<string> {
  const findId = (): string | null => {
    for (const worker of context.serviceWorkers()) {
      if (!worker.url().startsWith('chrome-extension://')) continue
      const id = worker.url().split('/')[2]
      if (id) return id
    }
    return null
  }

  let id = findId()
  if (id) return id

  const bootstrap = await context.newPage()
  try {
    await bootstrap.goto(`http://127.0.0.1:${FIXTURE_PORT}/dynamic-light.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    })
  } catch {
    await bootstrap.goto('about:blank')
  }
  await bootstrap.close()

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    id = findId()
    if (id) return id
    try {
      await context.waitForEvent('serviceworker', { timeout: 2_000 })
    } catch {
      /* retry */
    }
  }

  throw new Error('Extension service worker not found')
}

export async function extensionServiceWorker(context: BrowserContext) {
  const id = await resolveExtensionServiceWorker(context)
  const worker = context.serviceWorkers().find((w) => w.url().includes(id))
  if (!worker) throw new Error(`Service worker missing for extension ${id}`)
  return worker
}
