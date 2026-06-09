import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'LubanInjectedStyles',
      fileName: 'index',
    },
    emptyOutDir: true,
    rollupOptions: {
      external: ['@luban-ws/extension-settings'],
    },
  },
  plugins: [dts({ rollupTypes: true })],
})
