import { crx } from '@crxjs/vite-plugin'
import path from 'node:path'
import { defineConfig } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'
import react from '@vitejs/plugin-react'
import manifest from './manifest.config'

/** Vite 配置：CRXJS 负责 manifest 与多入口打包，开发期启用 HMR。 */
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), crx({ manifest })],
  resolve: {
    alias: {
      '@luban-ws/extension-settings': path.resolve(
        __dirname,
        '../../packages/extension-settings/src/index.ts',
      ),
      '@luban-ws/injected-styles': path.resolve(
        __dirname,
        '../../packages/injected-styles/src/index.ts',
      ),
      '@luban-ws/dynamic-recolor': path.resolve(
        __dirname,
        '../../packages/dynamic-recolor/src/index.ts',
      ),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
    cors: { origin: [/chrome-extension:\/\//] },
  },
  worker: { format: 'es' },
})
