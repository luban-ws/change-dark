import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * GitHub Pages：project 站点为 https://owner.github.io/repo/，需 base=/repo/；
 * user/org 站点（仓库名以 .github.io 结尾）根路径 base=/。
 * 也可在 CI 或本地显式设置 VITE_BASE_PATH（须以 / 开头，建议以 / 结尾）。
 */
function pagesBase(): string {
  const explicit = process.env.VITE_BASE_PATH
  if (explicit) {
    const trimmed = explicit.trim()
    if (!trimmed.startsWith('/')) {
      throw new Error('VITE_BASE_PATH must start with /')
    }
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
  }
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (process.env.CI === 'true' && repo) {
    if (repo.endsWith('.github.io')) {
      return '/'
    }
    return `/${repo}/`
  }
  return '/'
}

export default defineConfig({
  base: pagesBase(),
  plugins: [react()],
})
