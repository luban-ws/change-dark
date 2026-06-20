/**
 * RFC 034：当前文档解析并缓存 Site Policy。
 */

import {
  GLOBAL_DEFAULT_SITE_POLICY,
  mergeSitePolicies,
  resolveSitePolicy,
  type MergedSitePolicyV1,
  type SiteProfilePatchV1,
} from '@change-dark/site-catalog'

let activePolicy: MergedSitePolicyV1 = cloneDefaultSitePolicy()

function cloneDefaultSitePolicy(): MergedSitePolicyV1 {
  return mergeSitePolicies([], undefined)
}

export function refreshActiveSitePolicy(
  doc: Document,
  userPatch?: SiteProfilePatchV1,
): MergedSitePolicyV1 {
  activePolicy = resolveSitePolicy(doc.location.origin, doc.location.pathname, {
    userPatch,
  })
  return activePolicy
}

export function getActiveSitePolicy(): MergedSitePolicyV1 {
  return activePolicy
}

export function resetActiveSitePolicyForTests(): void {
  activePolicy = cloneDefaultSitePolicy()
}
