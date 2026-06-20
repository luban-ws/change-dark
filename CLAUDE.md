# change-dark — agent notes

Chrome extension + monorepo for **Dynamic-only** dark mode (RFC 031). Workspace packages use **`@change-dark/*`**.

## Layout

| Path | Role |
|------|------|
| `apps/chrome` | MV3 extension (content script, popup) |
| `packages/dynamic-recolor` | Stylesheet recolor, `light-dark()`, palette bind, WASM glue |
| `packages/injected-styles` | `buildDarkCss`, theme shell, style element injection |
| `packages/extension-settings` | Constants, selectors, palette, storage |
| `packages/dark-engine` | Rust/WASM color parse + modify |
| `docs/rfc/` | Specs; completed → `docs/rfc/completed/` |

## Theme = palette contract

Single source: `:root` vars `--cd-page-bg` / `--cd-page-fg` / `--cd-page-border` from `resolvePageColorsForPalette`.

| Layer | Purpose |
|-------|---------|
| Recolor overrides | Neutral literals + **`--*` custom props** → `var(--cd-page-bg/fg/border)` |
| Theme shell (`buildThemePaletteShellCss`) | Last in merge; **no `:where()`**; beats WASM class rules |
| Surface repair | Inline `background-color: var(--cd-page-bg)` only; skips buttons/links |

`color-scheme: dark` is set on `:root`. Sites using **`light-dark(light, dark)`** in CSS variables will show the **dark branch** unless we rewrite those `--*` definitions or shell the utility classes.

## CSS injection invariants (do not regress)

### 1. Never prefix `:root` / `:host` with a descendant combinator

**Broken (matches nothing):** `html[data-change-dark-root] :root { ... }`

`:root` *is* `<html>`. Use `html[data-change-dark-root]` or `html[data-change-dark-root][data-theme="…"]`.

Implementation: `prefixRecolorOverrideSelector` in `packages/dynamic-recolor/src/css-stylesheet.ts`.

### 2. Recolor override specificity

- Prefix normal selectors: `html[ROOT_ATTR] .class`
- Root / host / root-only attribute lists: map each comma part via `prefixSelectorPart`, dedupe
- `@keyframes` step selectors (`0%`, `from`): **no** html prefix

### 3. Merge order

`mergeRecolorStyleText`: `baseCss` → recolor overrides → **theme shell last**

### 4. Tests must prove selectors match, not only string shape

Bad: `expect(out).toContain('html[…] :root')`  
Good: `expect(out).toContain('html[…] {')` and `:root` rewrite tests; add browser/DOM checks for site bugs.

## Site-debug checklist

When a user reports “wrong black / wrong white” on a modern site:

1. Confirm `<html data-change-dark-root>` and injected `#change-dark-style` exist.
2. Inspect computed `background-color` on the offending node.
3. Check author `--*` vars (`getComputedStyle(documentElement).getPropertyValue('--…')`).
4. If values contain `light-dark(`, verify recolor output includes **`html[ROOT_ATTR] { --…: var(--cd-page-bg)`** (not `html[…] :root`).
5. Reload extension after `pnpm --filter @change-dark/chrome build`.

## Commands

```bash
pnpm run build
pnpm --filter @change-dark/dynamic-recolor test
pnpm --filter @change-dark/chrome build
```

## Post-mortem: Cloudflare login (2026-06)

**Symptom:** Page bg correct (Solarized); login card + Sign up near-black.

**Cause chain:** `color-scheme: dark` → `light-dark()` vars resolve to author dark branch → recolor skipped `var(--color-kumo-base)` unless `--*` definition rewritten → **`:root` override rules used invalid selector** → fix appeared in tests/strings but never applied in browser.

**Fixes:** `prefixSelectorPart` for `:root`/`:host`; `light-dark()` → palette vars on `--*`; theme shell for `bg-*-base` utilities.
