import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@change-dark/extension-settings': path.resolve(
        __dirname,
        '../extension-settings/src/index.ts',
      ),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
