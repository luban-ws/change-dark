import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/**
 * wasm-pack 仅生成中间产物 `pkg/`（不发布）；对外仅 `dist/`：
 * - `index.mjs`：Vite/Rollup 打包，WASM 内联为 data URL 并带严格 CSP JS 回退
 * - `index.d.ts` / `index.cjs`：由 `scripts/finish-dist.mjs` 在 `vite build` 之后写入
 */
const ROOT = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [],
  assetsInclude: ['**/*.wasm'],
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
