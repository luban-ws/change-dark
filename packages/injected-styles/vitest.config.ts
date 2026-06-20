import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@change-dark/extension-settings': path.resolve(
        __dirname,
        '../extension-settings/src/index.ts',
      ),
      '@change-dark/injected-styles': path.resolve(__dirname, './src/css.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
