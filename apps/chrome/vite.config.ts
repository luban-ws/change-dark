import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'
import manifest from './manifest.config'

/** Vite 配置：CRXJS 负责 manifest 与多入口打包，开发期启用 HMR。 */
export default defineConfig({
  plugins: [wasm(), topLevelAwait(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
    cors: { origin: [/chrome-extension:\/\//] },
  },
  worker: { format: 'es' },
})
