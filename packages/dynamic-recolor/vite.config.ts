import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'LubanDynamicRecolor',
      fileName: 'index',
    },
    emptyOutDir: true,
    rollupOptions: {
      external: [
        '@change-dark/dark-engine',
        '@change-dark/extension-settings',
        '@change-dark/injected-styles',
      ],
    },
  },
  plugins: [dts({ rollupTypes: true })],
})
