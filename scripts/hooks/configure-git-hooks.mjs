/**
 * husky 默认把 core.hooksPath 设为 .husky/_，其中 h 会在 HUSKY=0 时直接 exit 0。
 * 本仓库改为 .husky，由 scripts/hooks/* 执行并在入口拒绝 bypass 环境变量。
 */
import { execSync } from 'node:child_process'

try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' })
} catch {
  process.exit(0)
}

execSync('git config core.hooksPath .husky', { stdio: 'inherit' })
