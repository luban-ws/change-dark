import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

/** MV3 清单：全站内容脚本 + storage，用于嫦娥暗色模式开关。 */
export default defineManifest({
  manifest_version: 3,
  name: '嫦娥 Change Dark',
  version: pkg.version,
  description:
    '为不支持暗色模式的站点强制暗色；核心计算在 Rust/WASM 中完成以减轻主线程压力。',
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_start',
    },
  ],
})
