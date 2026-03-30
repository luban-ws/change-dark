/**
 * 产出可上传 Chrome Web Store 的 ZIP（仅含 `dist/` 根文件，勿打入 monorepo 源码）。
 * 需系统 PATH 中有 `zip`（macOS / Linux）；Windows 可装 Git Bash 或手动打包 `dist/`。
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const chromeRoot = join(__dirname, '..')
const distDir = join(chromeRoot, 'dist')
const outZip = join(chromeRoot, 'change-dark-extension.zip')

if (!existsSync(distDir)) {
  console.error('Missing dist/; run vite build first.')
  process.exit(1)
}

execSync(`zip -r -q "${outZip}" .`, { cwd: distDir, stdio: 'inherit' })
console.warn('packed', outZip)
