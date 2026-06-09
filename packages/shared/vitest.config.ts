import path from 'node:path'
import { defineConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@luban-ws/dark-engine': path.resolve(
        __dirname,
        '../dark-engine/src/index.ts',
      ),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
