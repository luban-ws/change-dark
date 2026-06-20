import { useState, useEffect } from 'react'
import {
  readGlobalPolicy, persistGlobalPolicy,
  readThemeFiltersState, persistThemeFiltersState,
  readPagePalette, persistPagePalette,
  readTypographyState, persistTypographyState,
  readSiteOverridesState, hasSiteScopedDataForOrigin,
  clearSiteOverrideForOrigin,
  upsertSiteThemeFiltersOverride, upsertSitePagePaletteOverride,
  upsertSiteTypographyOverride, readSiteCustomCssForPage,
  persistSiteCustomCssForOrigin, readSiteListState, persistSiteListState,
  toggleCurrentOriginInDenylist, readAutoDarkThreshold, persistAutoDarkThreshold,
  resolveEffectivePagePalette, resolveEffectiveTheme, resolveEffectiveTypography,
  hostnameLabelFromHttpOrigin, normalizeHttpOriginFromUrl, shouldApplyForcedDarkFromSiteList,
  clampThemeFilters, type ThemeFiltersStateV1, type PagePalette,
  POLICY_ON,
  STORAGE_KEY_POLICY, STORAGE_KEY_SITE_LIST, STORAGE_KEY_THEME_FILTERS,
  STORAGE_KEY_PAGE_PALETTE, STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_TYPOGRAPHY, STORAGE_KEY_SITE_CUSTOM_CSS,
  STORAGE_KEY_AUTO_DARK_THRESHOLD, DEFAULT_AUTO_DARK_THRESHOLD,
  type GlobalPolicy,
  typographyStateToSettings, clampTypographySettings, type TypographySettingsV1,
} from '@change-dark/extension-settings'

export function usePopupState() {
  const [origin, setOrigin] = useState<string | null>(null)
  const [editScope, setEditScope] = useState<'global' | 'site'>('global')
  const [hasSiteOverride, setHasSiteOverride] = useState(false)
  const [isSiteForcedDark, setIsSiteForcedDark] = useState(false)

  const [policy, setPolicy] = useState<GlobalPolicy>(POLICY_ON)
  const [filters, setFilters] = useState<ThemeFiltersStateV1>({ brightness: 100, contrast: 100, sepia: 0, saturate: 100 })
  const [palette, setPalette] = useState<PagePalette>('dark')
  const [typography, setTypography] = useState<TypographySettingsV1>({ fontEnabled: false, fontPreset: 'system', customFontFamily: '', textStrokeEnabled: false, textStrokeWidthPx: 0.06 })
  const [siteCss, setSiteCss] = useState('')
  const [siteList, setSiteList] = useState({ mode: 'not-invert-listed', entries: [] as string[] })
  const [autoDarkThreshold, setAutoDarkThreshold] = useState(DEFAULT_AUTO_DARK_THRESHOLD)

  async function refreshSiteButton(currentOrigin: string | null) {
    try {
      const state = await readSiteListState()
      if (currentOrigin) {
        setIsSiteForcedDark(shouldApplyForcedDarkFromSiteList(currentOrigin, state))
      }
    } catch {}
  }

  async function loadState(currentOrigin: string | null, activeScope: 'global' | 'site') {
    try {
      const gPolicy = await readGlobalPolicy()
      setPolicy(gPolicy)

      const gFilters = await readThemeFiltersState()
      const gPalette = await readPagePalette()
      const gTy = await readTypographyState()
      
      if (activeScope === 'global' || !currentOrigin) {
        setFilters(gFilters)
        setPalette(gPalette)
        setTypography(typographyStateToSettings(gTy))
        setHasSiteOverride(false)
      } else {
        const ov = await readSiteOverridesState()
        const eff = resolveEffectiveTheme(currentOrigin, 'dynamic', gFilters, ov)
        setFilters(eff.themeFilters)
        setPalette(resolveEffectivePagePalette(currentOrigin, gPalette, ov))
        setTypography(resolveEffectiveTypography(currentOrigin, gTy, ov))
        
        const hasOv = await hasSiteScopedDataForOrigin(currentOrigin)
        setHasSiteOverride(hasOv)
        
        try {
          setSiteCss(await readSiteCustomCssForPage(currentOrigin))
        } catch { setSiteCss('') }
      }

      const slState = await readSiteListState()
      setSiteList(slState)
      
      const threshold = await readAutoDarkThreshold()
      setAutoDarkThreshold(threshold)
    } catch {}
  }

  useEffect(() => {
    let resolvedOrigin: string | null = null
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) resolvedOrigin = normalizeHttpOriginFromUrl(tab.url)
      setOrigin(resolvedOrigin)
      refreshSiteButton(resolvedOrigin)
      loadState(resolvedOrigin, editScope)
    }).catch(() => {})

    const listener = (changes: any, area: string) => {
      if (area !== 'local') return
      
      const mustRefreshUi = [
        STORAGE_KEY_THEME_FILTERS, STORAGE_KEY_PAGE_PALETTE,
        STORAGE_KEY_SITE_OVERRIDES, STORAGE_KEY_TYPOGRAPHY, STORAGE_KEY_SITE_CUSTOM_CSS,
        STORAGE_KEY_AUTO_DARK_THRESHOLD
      ].some(k => changes[k])
      
      if (changes[STORAGE_KEY_POLICY] || changes[STORAGE_KEY_SITE_LIST] || mustRefreshUi) {
        loadState(resolvedOrigin, editScope)
        refreshSiteButton(resolvedOrigin)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [editScope])

  const actions = {
    setEditScope: (scope: 'global' | 'site') => {
      if (scope === 'site' && !origin) return
      setEditScope(scope)
    },
    toggleCurrentSiteForcedDark: async () => {
      if (!origin) return
      await toggleCurrentOriginInDenylist(origin)
    },
    setPolicy: (p: GlobalPolicy) => persistGlobalPolicy(p),
    setPagePalette: (p: PagePalette) => editScope === 'global' ? persistPagePalette(p) : upsertSitePagePaletteOverride(origin!, p),
    setFilters: (f: ThemeFiltersStateV1) => editScope === 'global' ? persistThemeFiltersState(f) : upsertSiteThemeFiltersOverride(origin!, f),
    setTypography: (t: TypographySettingsV1) => editScope === 'global' ? persistTypographyState({ v: 1, ...t }) : upsertSiteTypographyOverride(origin!, t),
    setSiteCustomCss: (css: string) => { if (origin) persistSiteCustomCssForOrigin(origin, css) },
    clearSiteOverride: async () => { if (origin) { await clearSiteOverrideForOrigin(origin); setEditScope('global'); } },
    updateSiteListMode: (mode: 'not-invert-listed' | 'invert-listed-only') => persistSiteListState({ v: 2, mode, entries: siteList.entries }),
    updateSiteListEntries: (entries: string[]) => persistSiteListState({ v: 2, mode: siteList.mode as any, entries }),
    setAutoDarkThreshold: (val: number) => persistAutoDarkThreshold(val)
  }

  return { 
    origin, hostnameTitle: origin ? hostnameLabelFromHttpOrigin(origin) : '', 
    editScope, hasSiteOverride, isSiteForcedDark, 
    policy, filters, palette, typography, siteCss, siteList, autoDarkThreshold,
    actions 
  }
}
