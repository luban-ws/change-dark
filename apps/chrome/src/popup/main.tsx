import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import App from './App'
import i18n, { initPopupLanguageFromStorage } from './i18n'
import '@radix-ui/themes/styles.css'
import { Theme } from '@radix-ui/themes'

async function mountPopup(): Promise<void> {
  await initPopupLanguageFromStorage()

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="large">
          <App />
        </Theme>
      </I18nextProvider>
    </React.StrictMode>,
  )
}

void mountPopup()
