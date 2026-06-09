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
        '@luban-ws/dark-engine',
        '@luban-ws/extension-settings',
        '@luban-ws/injected-styles',
      ],
    },
  },
  plugins: [dts({ rollupTypes: true })],
})
