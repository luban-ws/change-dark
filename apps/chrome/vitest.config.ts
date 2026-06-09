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
        '../../packages/dark-engine/src/index.ts',
      ),
      '@luban-ws/dark-shared': path.resolve(
        __dirname,
        '../../packages/shared/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
