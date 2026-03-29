import {
  POLICY_AUTO,
  POLICY_OFF,
  POLICY_ON,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_THEME_FILTERS,
  type GlobalPolicy,
} from '../shared/constants'
import { parseGlobalPolicy } from '../shared/migration'
import { isOriginInDenylist, normalizeHttpOriginFromUrl } from '../shared/site-list'
import {
  persistGlobalPolicy,
  persistThemeFiltersState,
  readGlobalPolicy,
  readSiteListState,
  readThemeFiltersState,
  toggleCurrentOriginInDenylist,
} from '../shared/storage'
import { clampThemeFilters, type ThemeFiltersStateV1 } from '../shared/theme-filters'

const POLICY_INPUT_NAME = 'policy'

function isGlobalPolicy(s: string): s is GlobalPolicy {
  return s === POLICY_AUTO || s === POLICY_ON || s === POLICY_OFF
}

function getPolicyInputs(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[name="${POLICY_INPUT_NAME}"][type="radio"]`,
    ),
  )
}

function setCheckedPolicy(policy: GlobalPolicy): void {
  for (const input of getPolicyInputs()) {
    input.checked = input.value === policy
  }
}

/** 当前标签页 http(s) origin；不可用时为 null。 */
let cachedHttpOrigin: string | null = null

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
    const denied = isOriginInDenylist(origin, state)
    btn.textContent = denied ? '在此站点启用强制暗色' : '在此站点禁用（加入忽略列表）'
    if (hint) {
      hint.textContent = denied
        ? '此站点在忽略列表中，不应用强制暗色。'
        : '将当前站点加入忽略列表后，与全局「开启」独立，本页不套暗色。'
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

async function loadThemeFiltersToInputs(): Promise<void> {
  try {
    const t = await readThemeFiltersState()
    applyThemeFiltersToInputs(t)
  } catch {
    /* ignore */
  }
}

function wireThemeFilterSliders(): void {
  const persist = (): void => {
    void persistThemeFiltersState(readThemeFiltersFromInputs()).catch(() => {})
  }
  for (const [sid] of TF_IDS) {
    const el = document.getElementById(sid) as HTMLInputElement | null
    if (!el) continue
    el.addEventListener('input', () => syncFilterValueLabels())
    el.addEventListener('change', persist)
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

  wireThemeFilterSliders()
  await loadThemeFiltersToInputs()

  wireSiteButton()
  await refreshSiteButton()

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    const ch = changes[STORAGE_KEY_POLICY]
    if (ch) {
      const next = parseGlobalPolicy(ch.newValue)
      if (next) setCheckedPolicy(next)
    }
    if (changes[STORAGE_KEY_SITE_LIST]) void refreshSiteButton()
    if (changes[STORAGE_KEY_THEME_FILTERS]) void loadThemeFiltersToInputs()
  })
}

void init()
