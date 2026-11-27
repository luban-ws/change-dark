import { useState, useEffect, useMemo } from 'react'
import {
  persistGlobalPolicy,
  persistThemeFiltersState,
  persistPagePalette,
  persistTypographyState,
  upsertSiteThemeFiltersOverride,
  upsertSitePagePaletteOverride,
  upsertSiteTypographyOverride,
  clearSiteOverrideForOrigin,
  persistSiteCustomCssForOrigin,
  persistSiteListState,
  toggleCurrentOriginInDenylist,
  persistAutoDarkThreshold,
  readPopupStorageSnapshot,
  parsePopupStorageSnapshot,
  hasSiteScopedDataInSnapshot,
  resolveEffectivePagePalette,
  resolveEffectiveTheme,
  resolveEffectiveTypography,
  hostnameLabelFromHttpOrigin,
  normalizeHttpOriginFromUrl,
  shouldApplyForcedDarkFromSiteList,
  type PopupStorageSnapshotV1,
  type ThemeFiltersStateV1,
  type PagePalette,
  type GlobalPolicy,
  type TypographySettingsV1,
  typographyStateToSettings,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_THEME_FILTERS,
  STORAGE_KEY_PAGE_PALETTE,
  STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_TYPOGRAPHY,
  STORAGE_KEY_SITE_CUSTOM_CSS,
  STORAGE_KEY_SITE_PROFILE_PATCHES,
  STORAGE_KEY_AUTO_DARK_THRESHOLD,
} from '@change-dark/extension-settings'
import { consumePopupPrefetch } from '../popup-prefetch'
import { takeMountPrefetch } from '../mount-app'

const UI_CACHE_KEY = 'cd_popup_ui_cache_v1'
const DEFAULT_SNAPSHOT = parsePopupStorageSnapshot({})

function readCachedSnapshot(): PopupStorageSnapshotV1 {
  try {
    const raw = globalThis.localStorage?.getItem(UI_CACHE_KEY)
    if (!raw) return DEFAULT_SNAPSHOT
    const parsed = JSON.parse(raw) as Partial<PopupStorageSnapshotV1>
    return {
      ...DEFAULT_SNAPSHOT,
      ...parsed,
    }
  } catch {
    return DEFAULT_SNAPSHOT
  }
}

function writeCachedSnapshot(snapshot: PopupStorageSnapshotV1): void {
  try {
    globalThis.localStorage?.setItem(
      UI_CACHE_KEY,
      JSON.stringify({
        policy: snapshot.policy,
        filters: snapshot.filters,
        palette: snapshot.palette,
        typography: snapshot.typography,
        siteList: snapshot.siteList,
        autoDarkThreshold: snapshot.autoDarkThreshold,
      }),
    )
  } catch {
    /* ignore */
  }
}

const POPUP_WATCHED_STORAGE_KEYS = [
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_THEME_FILTERS,
  STORAGE_KEY_PAGE_PALETTE,
  STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_TYPOGRAPHY,
  STORAGE_KEY_SITE_CUSTOM_CSS,
  STORAGE_KEY_SITE_PROFILE_PATCHES,
  STORAGE_KEY_AUTO_DARK_THRESHOLD,
] as const

export function usePopupState() {
  const [origin, setOrigin] = useState<string | null>(null)
  const [editScope, setEditScope] = useState<'global' | 'site'>('global')
  const [snapshot, setSnapshot] = useState<PopupStorageSnapshotV1>(readCachedSnapshot)
  const [isSyncing, setIsSyncing] = useState(true)

  useEffect(() => {
    let active = true
    const prefetch = takeMountPrefetch() ?? consumePopupPrefetch()

    const tabPromise = prefetch
      ? prefetch.activeTabPromise
      : chrome.tabs.query({ active: true, currentWindow: true })
    const snapshotPromise = prefetch
      ? prefetch.rawStoragePromise.then((raw) => parsePopupStorageSnapshot(raw))
      : readPopupStorageSnapshot()

    void Promise.all([tabPromise.catch(() => []), snapshotPromise.catch(() => null)]).then(
      ([tabs, nextSnapshot]) => {
        if (!active) return
        const tabUrl = tabs[0]?.url
        setOrigin(tabUrl ? normalizeHttpOriginFromUrl(tabUrl) : null)
        if (nextSnapshot) {
          setSnapshot(nextSnapshot)
          writeCachedSnapshot(nextSnapshot)
        }
        setIsSyncing(false)
      },
    )

    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local') return
      const touched = POPUP_WATCHED_STORAGE_KEYS.some((k) => changes[k] !== undefined)
      if (!touched) return
      void readPopupStorageSnapshot()
        .then((nextSnapshot) => {
          if (!active) return
          setSnapshot(nextSnapshot)
          writeCachedSnapshot(nextSnapshot)
        })
        .catch(() => {})
    }

    chrome.storage.onChanged.addListener(listener)
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  const view = useMemo(() => {
    const isSiteForcedDark = origin
      ? shouldApplyForcedDarkFromSiteList(origin, snapshot.siteList)
      : false

    if (editScope === 'global' || !origin) {
      return {
        isSiteForcedDark,
        hasSiteOverride: false,
        filters: snapshot.filters,
        palette: snapshot.palette,
        typography: typographyStateToSettings(snapshot.typography),
        siteCss: '',
      }
    }

    const effTheme = resolveEffectiveTheme(
      origin,
      'dynamic',
      snapshot.filters,
      snapshot.siteOverrides,
    )
    return {
      isSiteForcedDark,
      hasSiteOverride: hasSiteScopedDataInSnapshot(origin, snapshot),
      filters: effTheme.themeFilters,
      palette: resolveEffectivePagePalette(
        origin,
        snapshot.palette,
        snapshot.siteOverrides,
      ),
      typography: resolveEffectiveTypography(
        origin,
        snapshot.typography,
        snapshot.siteOverrides,
      ),
      siteCss: snapshot.siteCustomCss.byOrigin[origin]?.css ?? '',
    }
  }, [snapshot, origin, editScope])

  const actions = {
    setEditScope: (scope: 'global' | 'site') => {
      if (scope === 'site' && !origin) return
      setEditScope(scope)
    },
    toggleCurrentSiteForcedDark: async () => {
      if (!origin) return
      await toggleCurrentOriginInDenylist(origin)
    },
    setPolicy: (p: GlobalPolicy) => {
      setSnapshot((prev) => ({ ...prev, policy: p }))
      return persistGlobalPolicy(p)
    },
    setPagePalette: (p: PagePalette) => {
      if (editScope === 'global') {
        setSnapshot((prev) => ({ ...prev, palette: p }))
        return persistPagePalette(p)
      }
      return upsertSitePagePaletteOverride(origin!, p)
    },
    setFilters: (f: ThemeFiltersStateV1) => {
      if (editScope === 'global') {
        setSnapshot((prev) => ({ ...prev, filters: f }))
        return persistThemeFiltersState(f)
      }
      return upsertSiteThemeFiltersOverride(origin!, f)
    },
    setTypography: (t: TypographySettingsV1) => {
      if (editScope === 'global') {
        const next = { v: 1 as const, ...t }
        setSnapshot((prev) => ({ ...prev, typography: next }))
        return persistTypographyState(next)
      }
      return upsertSiteTypographyOverride(origin!, t)
    },
    setSiteCustomCss: (css: string) => {
      if (origin) {
        setSnapshot((prev) => {
          const nextByOrigin = { ...prev.siteCustomCss.byOrigin }
          if (css.trim()) nextByOrigin[origin] = { css }
          else delete nextByOrigin[origin]
          return {
            ...prev,
            siteCustomCss: {
              ...prev.siteCustomCss,
              byOrigin: nextByOrigin,
            },
          }
        })
        return persistSiteCustomCssForOrigin(origin, css)
      }
    },
    clearSiteOverride: async () => {
      if (origin) {
        await clearSiteOverrideForOrigin(origin)
        setEditScope('global')
      }
    },
    updateSiteListMode: (mode: 'not-invert-listed' | 'invert-listed-only') => {
      const next = { v: 2 as const, mode, entries: snapshot.siteList.entries }
      setSnapshot((prev) => ({ ...prev, siteList: next }))
      return persistSiteListState(next)
    },
    updateSiteListEntries: (entries: string[]) => {
      const next = { v: 2 as const, mode: snapshot.siteList.mode, entries }
      setSnapshot((prev) => ({ ...prev, siteList: next }))
      return persistSiteListState(next)
    },
    setAutoDarkThreshold: (val: number) => {
      setSnapshot((prev) => ({ ...prev, autoDarkThreshold: val }))
      return persistAutoDarkThreshold(val)
    },
  }

  return {
    origin,
    hostnameTitle: origin ? hostnameLabelFromHttpOrigin(origin) : '',
    editScope,
    hasSiteOverride: view.hasSiteOverride,
    isSiteForcedDark: view.isSiteForcedDark,
    policy: snapshot.policy,
    filters: view.filters,
    palette: view.palette,
    typography: view.typography,
    siteCss: view.siteCss,
    siteList: snapshot.siteList,
    autoDarkThreshold: snapshot.autoDarkThreshold,
    isSyncing,
    actions,
  }
}
