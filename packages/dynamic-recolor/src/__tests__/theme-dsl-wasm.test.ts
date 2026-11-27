import { describe, expect, it } from 'vitest'

import {
  compileThemeDsl,
  compileThemePatchDsl,
  compileThemePatchDslAsync,
  formatThemePatchDsl,
} from '@change-dark/dark-engine'

const GMP_THEME_SOURCE = `// GMP profile source
profile "google-marketing-platform" {
  priority 10
  match {
    hostSuffix [
      "marketingplatform.google.com",
    ]
  }
  surfaceRepair {
    neverPaint [
      ".h-c-page",
      ".h-c-grid",
      ".secondary-hero__background",
      ".secondary-hero__frame",
      ".gmp-banner",
    ]
    gutterProbe {
      mainSelector "main.gmp-page"
      insetPx 24
    }
  }
  recolor {
    forceShorthandProperties [
      "border-left",
      "border-right",
    ]
  }
}
`

describe('theme-dsl WASM bindings', () => {
  it('compiles .theme profile source to SiteProfileV1[] via Rust winnow WASM', () => {
    const res = compileThemeDsl(GMP_THEME_SOURCE)
    expect(res.ok).toBe(true)
    if (!res.ok) return

    expect(res.data).toEqual([
      {
        v: 1,
        id: 'google-marketing-platform',
        priority: 10,
        match: {
          hostSuffix: ['marketingplatform.google.com'],
        },
        surfaceRepair: {
          neverPaint: [
            '.h-c-page',
            '.h-c-grid',
            '.secondary-hero__background',
            '.secondary-hero__frame',
            '.gmp-banner',
          ],
          gutterProbe: {
            mainSelector: 'main.gmp-page',
            insetPx: 24,
          },
        },
        recolor: {
          forceShorthandProperties: ['border-left', 'border-right'],
        },
      },
    ])
  })

  it('compiles .theme patch sync/async and round-trips through formatThemePatchDsl', async () => {
    const patchSource = `patch {
  disabled false
  surfaceRepair {
    neverPaint [".ad-slot", ".hero-banner"]
    minPanelAreaPx 8000
  }
  recolor {
    cssVarSubstitute {
      "--bg-surface" { use bg; fallback "#ffffff" }
    }
  }
  customCss """
body { color: #e8e6e3; }
"""
}
`
    const syncRes = compileThemePatchDsl(patchSource)
    expect(syncRes.ok).toBe(true)
    if (!syncRes.ok) return

    const asyncRes = await compileThemePatchDslAsync(patchSource)
    expect(asyncRes).toEqual(syncRes)

    const formatted = formatThemePatchDsl(syncRes.data)
    expect(formatted.ok).toBe(true)
    if (!formatted.ok) return

    const reparsed = compileThemePatchDsl(formatted.data)
    expect(reparsed).toEqual(syncRes)
  })

  it('reports accurate 1-based line and column diagnostics on invalid .theme input', () => {
    const badProfile = compileThemeDsl(
      'profile "bad" {\n  match { hostEquals ["a.com"] }\n  unknownKey 123\n}\n',
    )
    expect(badProfile.ok).toBe(false)
    if (!badProfile.ok) {
      expect(badProfile.error.line).toBe(3)
      expect(badProfile.error.column).toBe(3)
      expect(badProfile.error.message.length).toBeGreaterThan(0)
    }

    const badPatch = compileThemePatchDsl(
      'patch {\n  disabled maybe\n}\n',
    )
    expect(badPatch.ok).toBe(false)
    if (!badPatch.ok) {
      expect(badPatch.error.line).toBe(2)
      expect(badPatch.error.column).toBe(12)
      expect(badPatch.error.message).toContain('boolean')
    }
  })
})
