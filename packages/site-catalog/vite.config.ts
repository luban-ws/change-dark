import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'LubanSiteCatalog',
      fileName: 'index',
    },
    emptyOutDir: true,
    rollupOptions: {
      external: ['@change-dark/extension-settings'],
    },
  },
  plugins: [dts({ rollupTypes: true })],
})
