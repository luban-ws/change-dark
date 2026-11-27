import React from 'react'
import ReactDOM from 'react-dom/client'
import '@radix-ui/themes/styles.css'
import './popup.css'
import { Theme } from '@radix-ui/themes'
import App from './App'
import { STORAGE_KEY_LANG, applyPopupLanguageFromStorageValue } from './i18n'
import { consumePopupPrefetch, startPopupPrefetch } from './popup-prefetch'

export function mountPopupApp(): void {
  const existing = consumePopupPrefetch() ?? startPopupPrefetch()
  // 重新放回给 usePopupState 使用（通过模块重新赋值太绕，改为直接传给 window 或 hook；这里复用一个新 slot 更简单）
  if (existing) {
    void existing.rawStoragePromise
      .then((raw) => {
        applyPopupLanguageFromStorageValue(raw[STORAGE_KEY_LANG])
      })
      .catch(() => {})
    sharedMountPrefetch = existing
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
        <App />
      </Theme>
    </React.StrictMode>,
  )
}

export let sharedMountPrefetch: ReturnType<typeof consumePopupPrefetch> = null

export function takeMountPrefetch() {
  const batch = sharedMountPrefetch
  sharedMountPrefetch = null
  return batch
}
