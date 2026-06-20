/**
 * RFC 034：解析当前页的最终 Site Policy。
 */

import { GLOBAL_DEFAULT_SITE_POLICY } from './defaults'
import { matchSiteProfiles } from './match'
import { mergeSitePolicies } from './merge'
import type { MergedSitePolicyV1, SiteProfilePatchV1, SiteProfileV1 } from './types'

import googleMarketingPlatform from './catalog/google-marketing-platform.json'

/** 随扩展发布的 bundled catalog（Phase 1 手写列表；后续可 codegen）。 */
export const BUNDLED_SITE_CATALOG: readonly SiteProfileV1[] = [
  googleMarketingPlatform as SiteProfileV1,
]

export interface ResolveSitePolicyOptions {
  catalog?: readonly SiteProfileV1[]
  userPatch?: SiteProfilePatchV1
}

/** 由 origin + pathname 解析合并后的 policy。 */
export function resolveSitePolicy(
  origin: string,
  pathname: string,
  options: ResolveSitePolicyOptions = {},
): MergedSitePolicyV1 {
  const catalog = options.catalog ?? BUNDLED_SITE_CATALOG
  const matched = matchSiteProfiles(origin, pathname, catalog)
  if (matched.length === 0 && !options.userPatch) {
    return GLOBAL_DEFAULT_SITE_POLICY
  }
  return mergeSitePolicies(matched, options.userPatch)
}
