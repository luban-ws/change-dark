import path from 'node:path'
import { defineConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@change-dark/site-catalog': path.resolve(
        __dirname,
        '../../packages/site-catalog/src/index.ts',
      ),
      '@change-dark/dark-engine': path.resolve(
        __dirname,
        '../../packages/dark-engine/src/index.ts',
      ),
      '@change-dark/extension-settings': path.resolve(
        __dirname,
        '../../packages/extension-settings/src/index.ts',
      ),
      '@change-dark/injected-styles': path.resolve(
        __dirname,
        '../../packages/injected-styles/src/index.ts',
      ),
      '@change-dark/dynamic-recolor': path.resolve(
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
