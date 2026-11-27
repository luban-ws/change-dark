/**
 * RFC 0034：解析当前页的最终 Site Policy。
 */

import { compileThemeDsl, compileThemePatchDsl } from '@change-dark/dark-engine'

import { GLOBAL_DEFAULT_SITE_POLICY } from './defaults'
import { matchSiteProfiles } from './match'
import { mergeSitePolicies } from './merge'
import type { MergedSitePolicyV1, SiteProfilePatchV1, SiteProfileV1 } from './types'

const BUNDLED_THEME_SOURCES = import.meta.glob<string>('./catalog/*.theme', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/**
 * 直接通过 Rust `winnow` WASM 编译一组 `.theme` 源码并校验重复 `id`（零中间 JSON）。
 */
export function loadSiteCatalogFromThemes(
  sourcesByPath: Record<string, string>,
): SiteProfileV1[] {
  const paths = Object.keys(sourcesByPath).sort()
  const seenIds = new Set<string>()
  const profiles: SiteProfileV1[] = []

  for (const path of paths) {
    const source = sourcesByPath[path]
    if (typeof source !== 'string') continue
    const compiled = compileThemeDsl(source)
    if (!compiled.ok) {
      throw new Error(
        `[site-catalog] ${path}:${compiled.error.line}:${compiled.error.column}: ${compiled.error.message}`,
      )
    }
    for (const profile of compiled.data as SiteProfileV1[]) {
      if (seenIds.has(profile.id)) {
        throw new Error(
          `[site-catalog] duplicate profile id "${profile.id}" in ${path}`,
        )
      }
      seenIds.add(profile.id)
      profiles.push(profile)
    }
  }

  profiles.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return profiles
}

let cachedBundledCatalog: readonly SiteProfileV1[] | null = null

/** 懒加载并缓存 bundled `.theme` catalog，避免模块顶层在 WASM 初始化前触发编译。 */
export function getBundledSiteCatalog(): readonly SiteProfileV1[] {
  if (!cachedBundledCatalog) {
    cachedBundledCatalog = loadSiteCatalogFromThemes(BUNDLED_THEME_SOURCES)
  }
  return cachedBundledCatalog
}

/** 随扩展发布的 bundled catalog：运行期直接由 `.theme` 源码经 Rust WASM 编译生效。 */
export const BUNDLED_SITE_CATALOG: readonly SiteProfileV1[] =
  /* @__PURE__ */ loadSiteCatalogFromThemes(BUNDLED_THEME_SOURCES)

export interface ResolveSitePolicyOptions {
  catalog?: readonly SiteProfileV1[]
  userPatch?: SiteProfilePatchV1
  userPatchDsl?: string
}

function compileOptionalUserPatchDsl(
  userPatchDsl?: string,
): SiteProfilePatchV1 | undefined {
  if (!userPatchDsl?.trim()) return undefined
  const res = compileThemePatchDsl(userPatchDsl)
  return res.ok ? (res.data as SiteProfilePatchV1) : undefined
}

/** 由 origin + pathname 或完整 URL 解析合并后的 policy。 */
export function resolveSitePolicy(
  originOrUrl: string,
  pathnameOrOptions?: string | ResolveSitePolicyOptions,
  maybeOptions: ResolveSitePolicyOptions = {},
): MergedSitePolicyV1 {
  let origin: string
  let pathname: string
  let options: ResolveSitePolicyOptions

  if (typeof pathnameOrOptions === 'string') {
    origin = originOrUrl
    pathname = pathnameOrOptions
    options = maybeOptions
  } else {
    options = pathnameOrOptions ?? {}
    try {
      const parsed = new URL(originOrUrl)
      origin = parsed.origin
      pathname = parsed.pathname
    } catch {
      origin = originOrUrl
      pathname = '/'
    }
  }

  const catalog = options.catalog ?? getBundledSiteCatalog()
  const userPatch =
    options.userPatch ?? compileOptionalUserPatchDsl(options.userPatchDsl)
  const matched = matchSiteProfiles(origin, pathname, catalog)
  if (matched.length === 0 && !userPatch) {
    return GLOBAL_DEFAULT_SITE_POLICY
  }
  return mergeSitePolicies(matched, userPatch)
}
