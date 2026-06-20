---
name: change-dark-recolor
description: >-
  change-dark Dynamic recolor layer — stylesheet overrides, palette vars,
  light-dark(), theme shell, prefixRecolorOverrideSelector. Use when fixing
  wrong site colors, adding recolor rules, editing css-stylesheet.ts,
  injected-styles theme shell, or debugging Cloudflare/Tailwind light-dark surfaces.
---

# change-dark Dynamic recolor

## When to use

- Site shows author near-black/white instead of preset (Solarized / sampled)
- Touching `packages/dynamic-recolor`, `packages/injected-styles`, content recolor path
- Adding support for CSS `light-dark()`, Tailwind v4 tokens, or `--*` custom properties

## Architecture (short)

1. Collect readable `document.styleSheets` (skip cross-origin SecurityError)
2. `buildRecolorOverrideStylesheet` → rules prefixed with `html[data-change-dark-root]`
3. Neutral colors → `var(--cd-page-bg)` / `var(--cd-page-fg)`
4. `buildThemePaletteShellCss()` merged **last**

Full map: repo root `CLAUDE.md`.

## Invariant: :root selector prefix

```text
WRONG:  html[data-change-dark-root] :root { --token: ... }
RIGHT:  html[data-change-dark-root] { --token: ... }
```

`:root` cannot be a descendant of `html`. Code: `prefixRecolorOverrideSelector` / `prefixSelectorPart` in `css-stylesheet.ts`.

## Invariant: light-dark()

With `color-scheme: dark`, `var(--author-surface)` may resolve to the **dark** branch of `light-dark()` before recolor runs.

Fix paths (prefer generic):

1. Rewrite `--*` declarations containing `light-dark()` → `var(--cd-page-bg|fg)` (`light-dark.ts`)
2. Theme shell on surface utilities: `[class*="bg-kumo-base"]`, `[class*="bg-"][class*="-base"]`

## Debug workflow

1. Build + reload extension: `pnpm --filter @change-dark/chrome build`
2. On page: `document.documentElement.hasAttribute('data-change-dark-root')`
3. Find node class (e.g. `bg-kumo-base`); read computed `background-color`
4. Read `--color-*` on `:root` via `getComputedStyle(document.documentElement)`
5. Inspect `#change-dark-style` for `--*` overrides — confirm selector is **`html[…]`** not `html[…] :root`
6. Run `pnpm --filter @change-dark/dynamic-recolor test`

## Tests to add when changing prefix logic

```typescript
expect(prefixRecolorOverrideSelector(':root')).toBe(`html[${ROOT_ATTR}]`)
expect(out).not.toContain(`html[${ROOT_ATTR}] :root`)
```

## Avoid

- Site-specific `customCss` unless engine cannot genericize
- Painting `background` shorthand in surface repair (use `background-color` only)
- `:where()` in theme shell selectors
