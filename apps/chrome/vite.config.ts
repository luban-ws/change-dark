import { crx } from '@crxjs/vite-plugin'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'
import react from '@vitejs/plugin-react'
import manifest from './manifest.config'
import { pruneRadixThemesCss } from './scripts/prune-radix-css'

function pruneRadixCssPlugin(): Plugin {
  return {
    name: 'prune-radix-themes-css',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0] ?? id
      if (cleanId.includes('@radix-ui/themes') && cleanId.endsWith('styles.css')) {
        return { code: pruneRadixThemesCss(code), map: null }
      }
      return null
    },
  }
}

function asyncPopupEntryScriptPlugin(): Plugin {
  return {
    name: 'async-popup-entry-script',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.filename.endsWith(path.join('src', 'popup', 'index.html'))) {
        return html
      }
      return html.replace(/<script\s+type="module"(?!\s+async\b)/g, '<script type="module" async')
    },
  }
}

/** Vite 配置：CRXJS 负责 manifest 与多入口打包，开发期启用 HMR。 */
export default defineConfig({
  plugins: [
    pruneRadixCssPlugin(),
    asyncPopupEntryScriptPlugin(),
    react(),
    wasm(),
    topLevelAwait(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@change-dark/extension-settings': path.resolve(
        __dirname,
        '../../packages/extension-settings/src/index.ts',
      ),
      '@change-dark/injected-styles': path.resolve(
        __dirname,
        '../../packages/injected-styles/src/index.ts',
      ),
      '@change-dark/dynamic-recolor': path.resolve(
        __dirname,
        '../../packages/dynamic-recolor/src/index.ts',
      ),
      '@change-dark/site-catalog': path.resolve(
        __dirname,
        '../../packages/site-catalog/src/index.ts',
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
