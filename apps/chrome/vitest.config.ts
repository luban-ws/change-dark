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
      '@luban-ws/extension-settings': path.resolve(
        __dirname,
        '../../packages/extension-settings/src/index.ts',
      ),
      '@luban-ws/injected-styles': path.resolve(
        __dirname,
        '../../packages/injected-styles/src/index.ts',
      ),
      '@luban-ws/dynamic-recolor': path.resolve(
        __dirname,
        '../../packages/dynamic-recolor/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
