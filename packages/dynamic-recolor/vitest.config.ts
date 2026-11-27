import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [],
  assetsInclude: ['**/*.wasm'],
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
    testTimeout: 15000,
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 4,
      },
    },
  },
})
