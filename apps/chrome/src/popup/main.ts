import {
  POLICY_AUTO,
  POLICY_OFF,
  POLICY_ON,
  SITE_LIST_MODE_INVERT_LISTED_ONLY,
  SITE_LIST_MODE_NOT_INVERT_LISTED,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_THEME_FILTERS,
  STORAGE_KEY_THEME_MODE,
  STORAGE_KEY_PAGE_PALETTE,
  STORAGE_KEY_TYPOGRAPHY,
  STORAGE_KEY_SITE_CUSTOM_CSS,
  THEME_MODE_DYNAMIC,
  THEME_MODE_FILTER_CSS,
  THEME_MODE_FILTER_PLUS,
  THEME_MODE_STATIC,
  type GlobalPolicy,
  type ThemeMode,
} from '../shared/constants'
import { shouldExposeFilterPlusMode } from '../shared/filter-plus-svg'
import { parseGlobalPolicy } from '../shared/migration'
import {
  MAX_SITE_LIST_ENTRIES,
  normalizeHttpOriginFromUrl,
  shouldApplyForcedDarkFromSiteList,
} from '../shared/site-list'
import {
  PAGE_PALETTE_DARK,
  PAGE_PALETTE_SOLARIZED_DARK,
  type PagePalette,
} from '../shared/page-palette'
import {
  resolveEffectivePagePalette,
  resolveEffectiveTheme,
  resolveEffectiveTypography,
} from '../shared/site-overrides'
import {
  clearSiteOverrideForOrigin,
  hasSiteScopedDataForOrigin,
  persistGlobalPolicy,
  persistSiteCustomCssForOrigin,
  persistSiteListState,
  persistPagePalette,
  persistThemeFiltersState,
  persistThemeMode,
  persistTypographyState,
  readGlobalPolicy,
  readPagePalette,
  readSiteCustomCssForPage,
  readSiteListState,
  readSiteOverridesState,
  readThemeFiltersState,
  readThemeMode,
  readTypographyState,
  toggleCurrentOriginInDenylist,
  upsertSitePagePaletteOverride,
  upsertSiteThemeFiltersOverride,
  upsertSiteThemeModeOverride,
  upsertSiteTypographyOverride,
} from '../shared/storage'
import { clampThemeFilters, type ThemeFiltersStateV1 } from '../shared/theme-filters'
import {
  TYPOGRAPHY_FONT_PRESET_CUSTOM,
  clampTypographySettings,
  DEFAULT_TYPOGRAPHY_SETTINGS,
  parseFontPreset,
  type TypographySettingsV1,
  typographyStateToSettings,
} from '../shared/typography'

const POLICY_INPUT_NAME = 'policy'

const THEME_MODE_INPUT_NAME = 'theme-mode'

const PAGE_PALETTE_INPUT_NAME = 'page-palette'

const EDIT_SCOPE_INPUT_NAME = 'edit-scope'

function getEditScopeScope(): 'global' | 'site' {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="${EDIT_SCOPE_INPUT_NAME}"][type="radio"]`,
    ),
  )
  for (const el of inputs) {
    if (el.checked) return el.value === 'site' ? 'site' : 'global'
  }
  return 'global'
}

function getEditScopeInputs(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="${EDIT_SCOPE_INPUT_NAME}"][type="radio"]`,
    ),
  )
}

function isGlobalPolicy(s: string): s is GlobalPolicy {
  return s === POLICY_AUTO || s === POLICY_ON || s === POLICY_OFF
}

function isThemeMode(s: string): s is ThemeMode {
  return (
    s === THEME_MODE_DYNAMIC ||
    s === THEME_MODE_STATIC ||
    s === THEME_MODE_FILTER_CSS ||
    s === THEME_MODE_FILTER_PLUS
  )
}

function isPagePalette(s: string): s is PagePalette {
  return s === PAGE_PALETTE_DARK || s === PAGE_PALETTE_SOLARIZED_DARK
}

function getPagePaletteInputs(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="${PAGE_PALETTE_INPUT_NAME}"][type="radio"]`,
    ),
  )
}

function setCheckedPagePalette(palette: PagePalette): void {
  for (const input of getPagePaletteInputs()) {
    input.checked = input.value === palette
  }
}

function getPolicyInputs(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="${POLICY_INPUT_NAME}"][type="radio"]`,
    ),
  )
}

function getThemeModeInputs(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="${THEME_MODE_INPUT_NAME}"][type="radio"]`,
    ),
  )
}

function setCheckedPolicy(policy: GlobalPolicy): void {
  for (const input of getPolicyInputs()) {
    input.checked = input.value === policy
  }
}

function setCheckedThemeMode(mode: ThemeMode): void {
  for (const input of getThemeModeInputs()) {
    input.checked = input.value === mode
  }
}

/** RFC 014：Firefox 上禁用 Filter+ 单选，避免误导；存储仍可保留 filter-plus。 */
function applyFilterPlusUiGate(): void {
  const input = document.getElementById('theme-mode-filter-plus-input') as HTMLInputElement | null
  const label = document.getElementById('theme-mode-filter-plus-label')
  if (!input || !label) return
  const ok = shouldExposeFilterPlusMode()
  input.disabled = !ok
  label.title = ok
    ? ''
    : 'Firefox 等环境 Help 标明兼容较差；页面将自动使用 CSS Filter（RFC 013）。'
}

/** 当前标签页 http(s) origin；不可用时为 null。 */
let cachedHttpOrigin: string | null = null

const SITE_LIST_MODE_INPUT_NAME = 'site-list-mode'

async function loadSiteListPanel(): Promise<void> {
  try {
    const s = await readSiteListState()
    const ta = document.getElementById('site-list-textarea') as HTMLTextAreaElement | null
    for (const el of Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[name="${SITE_LIST_MODE_INPUT_NAME}"][type="radio"]`,
      ),
    )) {
      if (el.value === SITE_LIST_MODE_INVERT_LISTED_ONLY) {
        el.checked = s.mode === SITE_LIST_MODE_INVERT_LISTED_ONLY
      } else {
        el.checked = s.mode === SITE_LIST_MODE_NOT_INVERT_LISTED
      }
    }
    if (ta) ta.value = s.entries.join('\n')
  } catch {
    /* ignore */
  }
}

async function persistSiteListFromPanel(): Promise<void> {
  const ta = document.getElementById('site-list-textarea') as HTMLTextAreaElement | null
  const invertOnly = document.querySelector<HTMLInputElement>(
    `input[name="${SITE_LIST_MODE_INPUT_NAME}"][value="${SITE_LIST_MODE_INVERT_LISTED_ONLY}"]`,
  )?.checked
  const mode =
    invertOnly === true ? SITE_LIST_MODE_INVERT_LISTED_ONLY : SITE_LIST_MODE_NOT_INVERT_LISTED
  const lines = (ta?.value ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const entries = [...new Set(lines)].sort().slice(0, MAX_SITE_LIST_ENTRIES)
  await persistSiteListState({ v: 2, mode, entries })
}

function wireSiteListPanel(): void {
  for (const el of Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="${SITE_LIST_MODE_INPUT_NAME}"][type="radio"]`,
    ),
  )) {
    el.addEventListener('change', () => {
      void persistSiteListFromPanel().catch(() => {})
    })
  }
  const ta = document.getElementById('site-list-textarea') as HTMLTextAreaElement | null
  if (ta) {
    ta.addEventListener('blur', () => {
      void persistSiteListFromPanel().catch(() => {})
    })
  }
}

async function refreshSiteButton(): Promise<void> {
  const btn = document.getElementById('site-exemption') as HTMLButtonElement | null
  const hint = document.getElementById('site-hint')
  if (!btn) return
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = tab?.url
    const origin = url ? normalizeHttpOriginFromUrl(url) : null
    cachedHttpOrigin = origin
    if (!origin) {
      btn.disabled = true
      btn.textContent = '当前页不支持（需 http/https）'
      if (hint) hint.textContent = '仅 Web 页面可使用站点忽略；系统页无 URL。'
      return
    }
    btn.disabled = false
    const state = await readSiteListState()
    const apply = shouldApplyForcedDarkFromSiteList(origin, state)
    const denied = !apply
    if (state.mode === SITE_LIST_MODE_INVERT_LISTED_ONLY) {
      btn.textContent = denied ? '将当前站加入列表以套用' : '从列表移除此站（不再套用）'
      if (hint) {
        hint.textContent = denied
          ? '「仅列表内套用」：当前站未命中列表规则，不套暗色；可加入精确 origin。'
          : '当前站命中列表，正在套用；可从列表移除精确 origin。'
      }
    } else {
      btn.textContent = denied ? '在此站点启用强制暗色' : '在此站点禁用（加入列表）'
      if (hint) {
        hint.textContent = denied
          ? '「列表内不套用」：当前站被规则命中，不套暗色。'
          : '将当前 origin 加入列表后，与全局「开启」独立，本页不套暗色。'
      }
    }
  } catch {
    btn.disabled = true
    btn.textContent = '无法读取当前标签页'
  }
}

const TF_IDS = [
  ['tf-brightness', 'tf-brightness-val'],
  ['tf-contrast', 'tf-contrast-val'],
  ['tf-sepia', 'tf-sepia-val'],
  ['tf-saturate', 'tf-saturate-val'],
] as const

const TF_KEY_BY_ID: Record<string, keyof ThemeFiltersStateV1> = {
  'tf-brightness': 'brightness',
  'tf-contrast': 'contrast',
  'tf-sepia': 'sepia',
  'tf-saturate': 'saturate',
}

function readThemeFiltersFromInputs(): ThemeFiltersStateV1 {
  const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.valueAsNumber
  return clampThemeFilters({
    brightness: g('tf-brightness'),
    contrast: g('tf-contrast'),
    sepia: g('tf-sepia'),
    saturate: g('tf-saturate'),
  })
}

function syncFilterValueLabels(): void {
  for (const [sid, vid] of TF_IDS) {
    const el = document.getElementById(sid) as HTMLInputElement | null
    const lab = document.getElementById(vid)
    if (el && lab) lab.textContent = String(el.valueAsNumber)
  }
}

function applyThemeFiltersToInputs(t: ThemeFiltersStateV1): void {
  for (const [sid] of TF_IDS) {
    const el = document.getElementById(sid) as HTMLInputElement | null
    const key = TF_KEY_BY_ID[sid]
    if (el && key) el.valueAsNumber = t[key]
  }
  syncFilterValueLabels()
}

function syncTypoStrokeLabel(): void {
  const el = document.getElementById('typo-stroke-width') as HTMLInputElement | null
  const lab = document.getElementById('typo-stroke-width-val')
  if (el && lab) lab.textContent = (el.valueAsNumber / 100).toFixed(2)
}

function updateTypoCustomRowVisibility(): void {
  const p = document.getElementById('typo-font-preset') as HTMLSelectElement | null
  const row = document.getElementById('typo-custom-row')
  if (!p || !row) return
  row.hidden = p.value !== TYPOGRAPHY_FONT_PRESET_CUSTOM
}

function updateTypoStrokeControlsEnabled(): void {
  const se = document.getElementById('typo-stroke-enabled') as HTMLInputElement | null
  const sr = document.getElementById('typo-stroke-width') as HTMLInputElement | null
  if (se && sr) sr.disabled = !se.checked
}

function readTypographyFromInputs(): TypographySettingsV1 {
  const fontEnabled = (document.getElementById('typo-font-enabled') as HTMLInputElement)?.checked ?? false
  const preset =
    parseFontPreset((document.getElementById('typo-font-preset') as HTMLSelectElement)?.value) ??
    DEFAULT_TYPOGRAPHY_SETTINGS.fontPreset
  const customFontFamily =
    (document.getElementById('typo-font-custom') as HTMLInputElement)?.value ?? ''
  const textStrokeEnabled =
    (document.getElementById('typo-stroke-enabled') as HTMLInputElement)?.checked ?? false
  const sw =
    (document.getElementById('typo-stroke-width') as HTMLInputElement)?.valueAsNumber ?? 6
  return clampTypographySettings({
    fontEnabled,
    fontPreset: preset,
    customFontFamily,
    textStrokeEnabled,
    textStrokeWidthPx: sw / 100,
  })
}

async function persistTypographyFromUi(): Promise<void> {
  const scope = getEditScopeScope()
  const cur = readTypographyFromInputs()
  if (scope === 'global' || !cachedHttpOrigin) {
    await persistTypographyState({ v: 1, ...cur })
  } else {
    await upsertSiteTypographyOverride(cachedHttpOrigin, cur)
  }
}

function applyTypographyToInputs(t: TypographySettingsV1): void {
  const c = clampTypographySettings(t)
  const fe = document.getElementById('typo-font-enabled') as HTMLInputElement | null
  if (fe) fe.checked = c.fontEnabled
  const p = document.getElementById('typo-font-preset') as HTMLSelectElement | null
  if (p) p.value = c.fontPreset
  const fc = document.getElementById('typo-font-custom') as HTMLInputElement | null
  if (fc) fc.value = c.customFontFamily
  const se = document.getElementById('typo-stroke-enabled') as HTMLInputElement | null
  if (se) se.checked = c.textStrokeEnabled
  const sr = document.getElementById('typo-stroke-width') as HTMLInputElement | null
  if (sr) sr.valueAsNumber = Math.round(c.textStrokeWidthPx * 100)
  syncTypoStrokeLabel()
  updateTypoCustomRowVisibility()
  updateTypoStrokeControlsEnabled()
}

function wireSiteCustomCssPanel(): void {
  const ta = document.getElementById('site-custom-css-textarea') as HTMLTextAreaElement | null
  if (!ta) return
  ta.addEventListener('blur', () => {
    if (!cachedHttpOrigin) return
    if (getEditScopeScope() !== 'site') return
    void persistSiteCustomCssForOrigin(cachedHttpOrigin, ta.value).catch(() => {})
  })
}

function wireTypographyPanel(): void {
  const fe = document.getElementById('typo-font-enabled') as HTMLInputElement | null
  if (fe) {
    fe.addEventListener('change', () => {
      void persistTypographyFromUi().catch(() => {})
    })
  }
  const p = document.getElementById('typo-font-preset') as HTMLSelectElement | null
  if (p) {
    p.addEventListener('change', () => {
      updateTypoCustomRowVisibility()
      void persistTypographyFromUi().catch(() => {})
    })
  }
  const fc = document.getElementById('typo-font-custom') as HTMLInputElement | null
  if (fc) {
    fc.addEventListener('blur', () => {
      void persistTypographyFromUi().catch(() => {})
    })
  }
  const se = document.getElementById('typo-stroke-enabled') as HTMLInputElement | null
  if (se) {
    se.addEventListener('change', () => {
      updateTypoStrokeControlsEnabled()
      void persistTypographyFromUi().catch(() => {})
    })
  }
  const sr = document.getElementById('typo-stroke-width') as HTMLInputElement | null
  if (sr) {
    sr.addEventListener('input', () => syncTypoStrokeLabel())
    sr.addEventListener('change', () => {
      void persistTypographyFromUi().catch(() => {})
    })
  }
}

/** 按「全局 / 仅当前站」刷新模式与滑块显示（合并后的有效值）。 */
async function refreshThemeUiFromStorage(): Promise<void> {
  const scope = getEditScopeScope()
  const gMode = await readThemeMode()
  const gFilters = await readThemeFiltersState()
  const gPalette = await readPagePalette()
  const gTy = await readTypographyState()
  if (scope === 'global' || !cachedHttpOrigin) {
    setCheckedThemeMode(gMode)
    setCheckedPagePalette(gPalette)
    applyThemeFiltersToInputs(gFilters)
    applyTypographyToInputs(typographyStateToSettings(gTy))
  } else {
    const ov = await readSiteOverridesState()
    const eff = resolveEffectiveTheme(cachedHttpOrigin, gMode, gFilters, ov)
    setCheckedThemeMode(eff.themeMode)
    applyThemeFiltersToInputs(eff.themeFilters)
    const effPalette = resolveEffectivePagePalette(cachedHttpOrigin, gPalette, ov)
    setCheckedPagePalette(effPalette)
    if (cachedHttpOrigin) {
      const effTy = resolveEffectiveTypography(cachedHttpOrigin, gTy, ov)
      applyTypographyToInputs(effTy)
    }
  }
  syncFilterValueLabels()
  await refreshSiteCustomCssPanel()
  await updateClearOverrideButton()
}

/** RFC 019：显示并同步每站 CSS 文本框（需「仅当前站」+ http(s) origin）。 */
async function refreshSiteCustomCssPanel(): Promise<void> {
  const fs = document.getElementById('site-custom-css-fieldset')
  const ta = document.getElementById('site-custom-css-textarea') as HTMLTextAreaElement | null
  if (!fs || !ta) return
  const show = getEditScopeScope() === 'site' && Boolean(cachedHttpOrigin)
  fs.hidden = !show
  if (show && cachedHttpOrigin) {
    try {
      ta.value = await readSiteCustomCssForPage(cachedHttpOrigin)
    } catch {
      ta.value = ''
    }
  }
}

async function persistThemeFiltersFromUi(): Promise<void> {
  const scope = getEditScopeScope()
  const cur = readThemeFiltersFromInputs()
  if (scope === 'global' || !cachedHttpOrigin) {
    await persistThemeFiltersState(cur)
  } else {
    await upsertSiteThemeFiltersOverride(cachedHttpOrigin, cur)
  }
}

async function persistThemeModeFromUi(mode: ThemeMode): Promise<void> {
  const scope = getEditScopeScope()
  if (scope === 'global' || !cachedHttpOrigin) {
    await persistThemeMode(mode)
  } else {
    await upsertSiteThemeModeOverride(cachedHttpOrigin, mode)
  }
}

async function persistPagePaletteFromUi(palette: PagePalette): Promise<void> {
  const scope = getEditScopeScope()
  if (scope === 'global' || !cachedHttpOrigin) {
    await persistPagePalette(palette)
  } else {
    await upsertSitePagePaletteOverride(cachedHttpOrigin, palette)
  }
}

async function updateClearOverrideButton(): Promise<void> {
  const btn = document.getElementById('clear-site-override') as HTMLButtonElement | null
  if (!btn) return
  if (!cachedHttpOrigin) {
    btn.hidden = true
    return
  }
  try {
    btn.hidden = !(await hasSiteScopedDataForOrigin(cachedHttpOrigin))
  } catch {
    btn.hidden = true
  }
}

/** 无 http(s) origin 时禁用「仅当前站」。 */
function applyEditScopeSiteAvailability(): void {
  const siteInput = document.getElementById('edit-scope-site-input') as HTMLInputElement | null
  const label = document.getElementById('edit-scope-site-label')
  if (!siteInput || !label) return
  const ok = Boolean(cachedHttpOrigin)
  siteInput.disabled = !ok
  label.title = ok ? '' : '需要 http/https 页面的 origin'
  if (!ok && siteInput.checked) {
    const g = document.querySelector<HTMLInputElement>(
      `input[name="${EDIT_SCOPE_INPUT_NAME}"][value="global"]`,
    )
    if (g) g.checked = true
  }
}

function wireEditScopeRadios(): void {
  for (const input of getEditScopeInputs()) {
    input.addEventListener('change', () => {
      void refreshThemeUiFromStorage().catch(() => {})
    })
  }
}

function wireClearSiteOverride(): void {
  const btn = document.getElementById('clear-site-override') as HTMLButtonElement | null
  if (!btn) return
  btn.addEventListener('click', () => {
    if (!cachedHttpOrigin) return
    void (async () => {
      try {
        await clearSiteOverrideForOrigin(cachedHttpOrigin!)
        await refreshThemeUiFromStorage()
      } catch {
        /* ignore */
      }
    })()
  })
}

function wireThemeFilterSliders(): void {
  for (const [sid] of TF_IDS) {
    const el = document.getElementById(sid) as HTMLInputElement | null
    if (!el) continue
    el.addEventListener('input', () => syncFilterValueLabels())
    el.addEventListener('change', () => {
      void persistThemeFiltersFromUi().catch(() => {})
    })
  }
}

function wireSiteButton(): void {
  const btn = document.getElementById('site-exemption') as HTMLButtonElement | null
  if (!btn) return
  btn.addEventListener('click', async () => {
    if (!cachedHttpOrigin) return
    try {
      await toggleCurrentOriginInDenylist(cachedHttpOrigin)
      await refreshSiteButton()
    } catch {
      /* 忽略写入失败 */
    }
  })
}

async function init(): Promise<void> {
  try {
    const policy = await readGlobalPolicy()
    setCheckedPolicy(policy)
  } catch {
    setCheckedPolicy(POLICY_ON)
  }

  for (const input of getPolicyInputs()) {
    input.addEventListener('change', async () => {
      if (!input.checked) return
      const v = input.value
      if (!isGlobalPolicy(v)) return
      try {
        await persistGlobalPolicy(v)
      } catch {
        /* 忽略写入失败，避免 popup 崩溃 */
      }
    })
  }

  for (const input of getThemeModeInputs()) {
    input.addEventListener('change', async () => {
      if (!input.checked) return
      const v = input.value
      if (!isThemeMode(v)) return
      try {
        await persistThemeModeFromUi(v)
      } catch {
        /* 忽略写入失败 */
      }
    })
  }

  for (const input of getPagePaletteInputs()) {
    input.addEventListener('change', async () => {
      if (!input.checked) return
      const v = input.value
      if (!isPagePalette(v)) return
      try {
        await persistPagePaletteFromUi(v)
      } catch {
        /* 忽略写入失败 */
      }
    })
  }

  wireEditScopeRadios()
  wireThemeFilterSliders()
  wireTypographyPanel()
  wireSiteCustomCssPanel()
  wireClearSiteOverride()

  wireSiteButton()
  wireSiteListPanel()
  await refreshSiteButton()
  await loadSiteListPanel()
  applyEditScopeSiteAvailability()
  await refreshThemeUiFromStorage()

  applyFilterPlusUiGate()

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    const ch = changes[STORAGE_KEY_POLICY]
    if (ch) {
      const next = parseGlobalPolicy(ch.newValue)
      if (next) setCheckedPolicy(next)
    }
    if (changes[STORAGE_KEY_SITE_LIST]) {
      void loadSiteListPanel()
      void refreshSiteButton().then(() => {
        applyEditScopeSiteAvailability()
        void refreshThemeUiFromStorage()
      })
    }
    if (
      changes[STORAGE_KEY_THEME_FILTERS] ||
      changes[STORAGE_KEY_THEME_MODE] ||
      changes[STORAGE_KEY_PAGE_PALETTE] ||
      changes[STORAGE_KEY_SITE_OVERRIDES] ||
      changes[STORAGE_KEY_TYPOGRAPHY] ||
      changes[STORAGE_KEY_SITE_CUSTOM_CSS]
    ) {
      void refreshThemeUiFromStorage()
    }
  })
}

void init()
