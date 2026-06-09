import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'LubanExtensionSettings',
      fileName: 'index',
    },
    emptyOutDir: true,
  },
  plugins: [dts({ rollupTypes: true })],
})
