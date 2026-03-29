/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** CI 注入：owner/repo，用于「查看仓库」链接 */
  readonly VITE_GITHUB_REPO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
