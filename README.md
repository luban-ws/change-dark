# 嫦娥 · Change Dark

A **Chromium (Manifest V3) extension** that pushes a **forced dark appearance** onto sites without a native dark theme. Heavy color work is meant to run in **Rust compiled to WebAssembly**; the UI and injection layer live in **TypeScript** and are bundled with **Vite** and [**CRXJS**](https://github.com/crxjs/chrome-extension-tools).

## Bundling

Every **pnpm workspace package** ships its JS surface through **Vite** (`vite build`):

- `apps/chrome` — app + CRXJS extension bundle → `dist/`.
- `packages/dark-engine` — `wasm-pack` 只写 **gitignored 的 `pkg/`**（中间体）；**Vite** 打成唯一发布目录 **`dist/`**（`index.mjs` 内联 WASM，`index.d.ts` 与 `index.cjs` 由 `scripts/finish-dist.mjs` 收尾）。**CommonJS** 仍经 `index.cjs` 桥：`require()` → `Promise<module>`。
- `packages/dark-color-utils` — Rust + Vite library → **`dist/index.mjs`** and **`dist/index.cjs`** (true dual bundle).

Scope: **`@luban-ws/*`** workspace packages.

**Registry：** 目前各包为 **`private: true`**，**不打算发布到 npm**；`dist/` 与 `package.json` 的 `files` / `exports` 仅用于 monorepo 内消费与日后若需要再发布时不必大改结构。

## Monorepo layout

| Path | Role |
|------|------|
| `apps/chrome/` | Extension: MV3 service worker, content scripts, Vite → `apps/chrome/dist` |
| `packages/dark-engine/` | `wasm-pack` → gitignored `pkg/` → Vite → **`dist/` only**（`npm` `files` 不含 `pkg`） |
| `packages/dark-color-utils/` | Rust crate `dark_color_utils`; JS placeholder via Vite → `dist/` |
| `docs/rfc/` | One RFC per feature or baseline — see [`docs/rfc/README.md`](docs/rfc/README.md) |
| `.github/workflows/ci.yml` | CI: `pnpm` install, `build`, `test`, `lint` (includes `wasm32-unknown-unknown`) |

Orchestration: **pnpm workspaces** + **Turborepo** (`turbo run …`).

## Prerequisites

- **Node.js** (CI uses 22) and **pnpm** 9 (`packageManager` is pinned in root `package.json`).
- **Rust** via **rustup**, with target **`wasm32-unknown-unknown`** (see root [`rust-toolchain.toml`](rust-toolchain.toml)).
- Local builds use **`wasm-pack`** from the workspace (installed with `pnpm install`). If your shell prefers **Homebrew’s `rustc`** over rustup, the `dark-engine` package prepends `$HOME/.cargo/bin` to `PATH` so the wasm target resolves correctly.

## Commands

From the repository root:

```bash
pnpm install
pnpm run build    # Turbo: Vite in each package (dark-engine runs wasm-pack first)
pnpm run test
pnpm run lint
pnpm run dev      # Vite dev server for the chrome app (WASM pkg should exist first)
```

## Try the extension

1. Run `pnpm run build`.
2. Chrome → **Extensions** → **Load unpacked**.
3. Choose the folder **`apps/chrome/dist`** (relative to the repo root). **Do not** select the monorepo root — Chrome needs a directory that contains `manifest.json`; the repo root has none, which triggers “Manifest file is missing or unreadable”.

## Specs and tasks

- **Architecture (Approved):** [`docs/rfc/001-rust-wasm-monorepo-and-chrome-host.md`](docs/rfc/001-rust-wasm-monorepo-and-chrome-host.md)
- **Feature list + task IDs:** [`docs/rfc/README.md`](docs/rfc/README.md) and [`TASK_TRACKING.md`](TASK_TRACKING.md)
- **Roadmap:** [`ROADMAP.md`](ROADMAP.md)

Product ideas are tracked with a **one-RFC-one-topic** rule; Dark Reader is used only as a **behavioral reference**, not as a code source ([Dark Reader Help](https://darkreader.org/help/en/)).

## License

Private / unspecified — add a `LICENSE` file when you decide distribution terms.
