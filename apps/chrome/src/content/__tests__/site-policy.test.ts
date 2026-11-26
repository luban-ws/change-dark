/**
 * @vitest-environment jsdom
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, beforeEach } from 'vitest'

import { resolveSitePolicy } from '@change-dark/site-catalog'

import { shouldPaintOpaqueLightSurface } from '../light-surface-utils'
import { resetActiveSitePolicyForTests } from '../site-policy'

function collectNonTestTsFiles(rootDir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const full = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        continue
      }
      out.push(...collectNonTestTsFiles(full))
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.spec.ts')
    ) {
      out.push(full)
    }
  }
  return out
}

describe('site policy integration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    resetActiveSitePolicyForTests()
  })

  it('GMP profile neverPaint 阻止 h-c-page 铺底', () => {
    const policy = resolveSitePolicy(
      'https://marketingplatform.google.com',
      '/about/analytics/',
    )
    expect(policy.matchedProfileIds).toContain('google-marketing-platform')

    const grid = document.createElement('div')
    grid.className = 'h-c-page'
    grid.style.backgroundColor = 'rgb(255, 255, 255)'
    document.body.appendChild(grid)

    expect(shouldPaintOpaqueLightSurface(grid, policy.surfaceRepair)).toBe(false)
  })

  it('RFC 0034 grep gate: 运行时源码不含 marketingplatform.google.com 硬编码', () => {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const contentDir = path.resolve(here, '..')
    const recolorDir = path.resolve(here, '../../../../../packages/dynamic-recolor/src')
    expect(existsSync(contentDir)).toBe(true)
    expect(existsSync(recolorDir)).toBe(true)

    const files = [
      ...collectNonTestTsFiles(contentDir),
      ...collectNonTestTsFiles(recolorDir),
    ]
    expect(files.length).toBeGreaterThan(0)

    const offenders = files.filter((file) =>
      readFileSync(file, 'utf8').includes('marketingplatform.google.com'),
    )
    expect(offenders).toEqual([])
  })
})
