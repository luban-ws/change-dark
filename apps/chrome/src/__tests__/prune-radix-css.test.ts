import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pruneRadixThemesCss } from '../../scripts/prune-radix-css'

const require = createRequire(import.meta.url)

function countChar(str: string, target: string): number {
  let count = 0
  for (let i = 0; i < str.length; i += 1) {
    if (str[i] === target) count += 1
  }
  return count
}

describe('pruneRadixThemesCss', () => {
  it('preserves dark theme, used palette scales, and used component selectors while dropping unused bloat', () => {
    const sample = `
      .dark, .dark-theme {
        --slate-1: #111113;
        --tomato-1: #181111;
        --cyan-9: #00a2c7;
        --red-9: #e5484d;
      }
      .light, .light-theme { --gray-1: #fcfcfc; }
      [data-accent-color='purple'] { --accent-9: var(--purple-9); }
      [data-accent-color='cyan'] { --accent-9: var(--cyan-9); }
      @media (min-width: 1024px) { .rt-r-size-3 { font-size: 16px; } }
      @media (color-gamut: p3) { .dark { --cyan-9: color(display-p3 0 0.6 0.8); --tomato-9: color(display-p3 1 0 0); } }
      .rt-TableRoot { display: table; }
      .rt-DialogContent { padding: 24px; }
      .rt-Card { border-radius: 8px; }
      .rt-SwitchRoot { display: inline-flex; }
      .rt-SelectTrigger { display: inline-flex; }
      .rt-SliderRoot { display: flex; }
      .rt-SegmentedControlRoot { display: inline-grid; }
      .rt-TabsList { display: flex; }
      .rt-ScrollAreaRoot { overflow: hidden; }
      .rt-Heading { font-weight: 700; }
      .rt-Text { margin: 0; }
      .rt-Button { cursor: pointer; }
    `
    const out = pruneRadixThemesCss(sample)

    expect(countChar(out, '{')).toBe(countChar(out, '}'))
    expect(out).toContain('.dark, .dark-theme')
    expect(out).toContain('--slate-1:')
    expect(out).toContain('--cyan-9:')
    expect(out).toContain('--red-9:')
    expect(out).toContain("[data-accent-color='cyan']")
    expect(out).toContain('.rt-Card')
    expect(out).toContain('.rt-SwitchRoot')
    expect(out).toContain('.rt-SelectTrigger')
    expect(out).toContain('.rt-SliderRoot')
    expect(out).toContain('.rt-SegmentedControlRoot')
    expect(out).toContain('.rt-TabsList')
    expect(out).toContain('.rt-ScrollAreaRoot')
    expect(out).toContain('.rt-Heading')
    expect(out).toContain('.rt-Text')
    expect(out).toContain('.rt-Button')

    expect(out).not.toContain('.light, .light-theme')
    expect(out).not.toContain('--tomato-1:')
    expect(out).not.toContain('--tomato-9:')
    expect(out).not.toContain("[data-accent-color='purple']")
    expect(out).not.toContain('min-width: 1024px')
    expect(out).not.toContain('.rt-TableRoot')
    expect(out).not.toContain('.rt-DialogContent')
  })

  it('shrinks real @radix-ui/themes/styles.css by at least 60% with balanced braces', () => {
    const stylesPath = require.resolve('@radix-ui/themes/styles.css')
    const raw = readFileSync(stylesPath, 'utf8')
    const pruned = pruneRadixThemesCss(raw)

    expect(countChar(pruned, '{')).toBe(countChar(pruned, '}'))
    expect(pruned.length).toBeLessThan(raw.length * 0.4)
    expect(pruned).toContain('.rt-BaseCard')
    expect(pruned).toContain('.rt-BaseButton')
    expect(pruned).toContain('.rt-BaseMenuContent')
    expect(pruned).toContain('.rt-BaseTabList')
    expect(pruned).toContain('.rt-PopperContent')
    expect(pruned).toContain('.rt-SelectTrigger')
  })
})
