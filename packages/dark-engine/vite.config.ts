import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

/**
 * wasm-pack 仅生成中间产物 `pkg/`（不发布）；对外仅 `dist/`：
 * - `index.mjs`：Vite/Rollup 打包，WASM 内联为 data URL
 * - `index.d.ts` / `index.cjs`：由 `scripts/finish-dist.mjs` 在 `vite build` 之后写入
 */
const ROOT = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  build: {
    lib: {
      entry: resolve(ROOT, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    rollupOptions: {
      output: {
        assetFileNames: '[name][extname]',
      },
      external: [],
    },
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: true,
  },
})
