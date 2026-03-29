import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const ROOT = dirname(fileURLToPath(import.meta.url))

/** 纯 Rust crate 的 JS 侧仅占位；同样走 Vite library 以统一构建工具。 */
export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(ROOT, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.cjs'),
    },
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: true,
  },
})
