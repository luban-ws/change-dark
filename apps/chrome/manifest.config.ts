import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

import {
  COMMAND_TOGGLE_CURRENT_SITE,
  COMMAND_TOGGLE_GLOBAL,
} from '@luban-ws/shared'
import { CWS_HOMEPAGE_URL, CWS_SHORT_DESCRIPTION } from './src/store-listing-meta'

/** MV3 清单：全站内容脚本 + storage，用于嫦娥暗色模式开关。 */
export default defineManifest({
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extName__',
  version: pkg.version,
  description: '__MSG_extDesc__',
  homepage_url: CWS_HOMEPAGE_URL,
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  /** 仅 `storage`：`tabs` / `activeTab` 在已声明 `<all_urls>` 主机权限时属冗余，避免「过度权限」拒审。 */
  permissions: ['storage'],
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
    default_title: '__MSG_extName__',
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
    },
  },
  /** 与 popup 同页，便于在新标签页中编辑长表单（RFC 007 渐进 options）。 */
  options_ui: {
    page: 'src/popup/index.html',
    open_in_tab: true,
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
