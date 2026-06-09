import { useCallback, useSyncExternalStore } from 'react'
import i18n, {
  POPUP_LOCALES,
  normalizePopupLanguage,
  type PopupLanguage,
  type PopupTranslationKey,
} from './i18n'

function currentPopupLanguage(): PopupLanguage {
  return normalizePopupLanguage(i18n.language) ?? 'en'
}

function subscribeI18nLanguage(onStoreChange: () => void): () => void {
  const handler = (): void => {
    onStoreChange()
  }
  i18n.on('languageChanged', handler)
  return () => {
    i18n.off('languageChanged', handler)
  }
}

/** 直接从 POPUP_LOCALES 取文案，不依赖 i18next 资源解析时序。 */
export function usePopupT() {
  const lng = useSyncExternalStore(
    subscribeI18nLanguage,
    currentPopupLanguage,
    () => 'en' as PopupLanguage,
  )

  const t = useCallback(
    (key: PopupTranslationKey): string =>
      POPUP_LOCALES[lng].translation[key] ?? POPUP_LOCALES.en.translation[key],
    [lng],
  )

  return { t, i18n, lng }
}
