import path from 'node:path'
import { defineConfig } from 'vitest/config'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@change-dark/dark-engine': path.resolve(__dirname, '../dark-engine/src/index.ts'),
      '@change-dark/extension-settings': path.resolve(
        __dirname,
        '../extension-settings/src/index.ts',
      ),
      '@change-dark/injected-styles': path.resolve(__dirname, '../injected-styles/src/css.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
