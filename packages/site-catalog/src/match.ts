/**
 * RFC 034：URL / origin 匹配 catalog 条目。
 */

import type { SiteProfileMatchV1, SiteProfileV1 } from './types'

function hostFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function matchHost(host: string, rule: SiteProfileMatchV1): boolean {
  const h = host.toLowerCase()
  if (rule.hostEquals?.some((eq) => h === eq.toLowerCase())) return true
  if (rule.hostSuffix?.some((suffix) => h === suffix.toLowerCase() || h.endsWith(`.${suffix.toLowerCase()}`))) {
    return true
  }
  return !rule.hostEquals?.length && !rule.hostSuffix?.length
}

function matchPath(pathname: string, rule: SiteProfileMatchV1): boolean {
  if (!rule.pathPrefix?.length) return true
  return rule.pathPrefix.some((prefix) => pathname.startsWith(prefix))
}

/** 单条 profile 是否匹配当前页。 */
export function matchesSiteProfile(
  origin: string,
  pathname: string,
  profile: SiteProfileMatchV1,
): boolean {
  const host = hostFromOrigin(origin)
  if (!host) return false
  return matchHost(host, profile) && matchPath(pathname, profile)
}

/** 返回所有匹配条目，按 priority 降序。 */
export function matchSiteProfiles(
  origin: string,
  pathname: string,
  catalog: readonly SiteProfileV1[],
): SiteProfileV1[] {
  return catalog
    .filter((p) => matchesSiteProfile(origin, pathname, p.match))
    .slice()
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}
