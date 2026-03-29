import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

import {
  COMMAND_TOGGLE_CURRENT_SITE,
  COMMAND_TOGGLE_GLOBAL,
} from './src/shared/constants'

/** MV3 清单：全站内容脚本 + storage，用于嫦娥暗色模式开关。 */
export default defineManifest({
  manifest_version: 3,
  name: '嫦娥 Change Dark',
  version: pkg.version,
  description:
    '为不支持暗色模式的站点强制暗色；核心计算在 Rust/WASM 中完成以减轻主线程压力。',
  permissions: ['storage', 'activeTab', 'tabs'],
  host_permissions: ['<all_urls>'],
  commands: {
    [COMMAND_TOGGLE_GLOBAL]: {
      suggested_key: {
        default: 'Alt+Shift+D',
        mac: 'Alt+Shift+D',
      },
      description: '全局切换强制暗色（开/关）',
    },
    [COMMAND_TOGGLE_CURRENT_SITE]: {
      suggested_key: {
        default: 'Alt+Shift+L',
        mac: 'Alt+Shift+L',
      },
      description: '当前站点加入/移出忽略列表',
    },
  },
  action: {
    default_title: '嫦娥 Change Dark',
    default_popup: 'src/popup/index.html',
  },
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
