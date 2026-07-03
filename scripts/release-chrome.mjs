/**
 * Monorepo 本地 Chrome 扩展 GitHub Release（无 CI）：build → pack → tag → gh upload。
 *
 * 依赖：git、pnpm、gh（https://cli.github.com/）、zip
 *
 * 用法（仓库根目录）：
 *   pnpm release:chrome
 *   pnpm release:chrome -- --bump patch --commit
 *   pnpm release:chrome -- --dry-run
 */
import { execFileSync, execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const chromeRoot = join(repoRoot, 'apps/chrome')
const pkgPath = join(chromeRoot, 'package.json')
const sitePkgPath = join(repoRoot, 'apps/site/package.json')
const zipPath = join(repoRoot, 'dist/chrome/change-dark-extension.zip')

const TAG_PREFIX = 'v'

/** @typedef {'patch' | 'minor' | 'major'} BumpKind */

function usage() {
  console.log(`\
本地 GitHub Release — Chrome 扩展（手动，无 Actions）

  pnpm release:chrome [options]

选项：
  --bump patch|minor|major   递增 apps/chrome/package.json 的 version
  --commit                   --bump 后自动 git commit（仅 version 文件）
  --notes TEXT               Release 说明（默认：自上一 tag 起的 commit 列表）
  --notes-file PATH          从文件读取 release notes
  --skip-build               跳过 monorepo \`pnpm run build\`
  --skip-tag                 不创建 / 推送 git tag
  --skip-push                不 git push / 不 push tag
  --pack-only                仅 build + pack，不上传 release
  --dry-run                  只打印将执行的步骤
  -h, --help                 显示帮助

前置：已 \`gh auth login\`；版本号以 apps/chrome/package.json 为准。
`)
}

function parseArgs(argv) {
  /** @type {{ bump?: BumpKind; commit: boolean; notes?: string; notesFile?: string; skipBuild: boolean; skipTag: boolean; skipPush: boolean; packOnly: boolean; dryRun: boolean }} */
  const opts = {
    commit: false,
    skipBuild: false,
    skipTag: false,
    skipPush: false,
    packOnly: false,
    dryRun: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') {
      usage()
      process.exit(0)
    }
    if (arg === '--bump') {
      const kind = argv[++i]
      if (kind !== 'patch' && kind !== 'minor' && kind !== 'major') {
        console.error('--bump 须为 patch | minor | major')
        process.exit(1)
      }
      opts.bump = kind
      continue
    }
    if (arg === '--commit') {
      opts.commit = true
      continue
    }
    if (arg === '--notes') {
      opts.notes = argv[++i] ?? ''
      continue
    }
    if (arg === '--notes-file') {
      opts.notesFile = argv[++i]
      continue
    }
    if (arg === '--skip-build') {
      opts.skipBuild = true
      continue
    }
    if (arg === '--skip-tag') {
      opts.skipTag = true
      continue
    }
    if (arg === '--skip-push') {
      opts.skipPush = true
      continue
    }
    if (arg === '--pack-only') {
      opts.packOnly = true
      continue
    }
    if (arg === '--dry-run') {
      opts.dryRun = true
      continue
    }
    console.error(`未知参数: ${arg}`)
    usage()
    process.exit(1)
  }
  return opts
}

function run(cmd, { cwd = repoRoot, dryRun = false } = {}) {
  console.log(`\n→ ${cmd}`)
  if (dryRun) return ''
  return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' })
}

function requireTool(name, checkCmd) {
  const r = spawnSync(checkCmd, { shell: true, stdio: 'ignore' })
  if (r.status !== 0) {
    console.error(`缺少依赖: ${name}（${checkCmd}）`)
    process.exit(1)
  }
}

function readPkg() {
  return JSON.parse(readFileSync(pkgPath, 'utf8'))
}

function writePkg(pkg) {
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, 'utf8')
}

/** @param {string} version @param {BumpKind} kind */
function bumpVersion(version, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(version)
  if (!m) {
    console.error(`无法解析 semver: ${version}`)
    process.exit(1)
  }
  let major = Number(m[1])
  let minor = Number(m[2])
  let patch = Number(m[3])
  if (kind === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (kind === 'minor') {
    minor += 1
    patch = 0
  } else {
    patch += 1
  }
  return `${major}.${minor}.${patch}`
}

function tagExists(name, dryRun) {
  if (dryRun) return false
  const r = spawnSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${name}`], {
    cwd: repoRoot,
    stdio: 'ignore',
  })
  return r.status === 0
}

function tagName(version) {
  return `${TAG_PREFIX}${version}`
}

function isPkgDirty() {
  const r = spawnSync('git', ['status', '--porcelain', pkgPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return Boolean(r.stdout?.trim())
}

function gitNotesSinceLastTag() {
  try {
    const last = execSync('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const log = execFileSync(
      'git',
      ['log', `${last}..HEAD`, '--pretty=format:%h %s'],
      { cwd: repoRoot, encoding: 'utf8' },
    ).trim()
    return log ? `Changes since ${last}:\n\n${log}` : `Release ${tagName(readPkg().version)}`
  } catch {
    return `Release ${tagName(readPkg().version)}`
  }
}

function resolveNotes(opts) {
  if (opts.notes != null) return opts.notes
  if (opts.notesFile) {
    if (!existsSync(opts.notesFile)) {
      console.error(`notes 文件不存在: ${opts.notesFile}`)
      process.exit(1)
    }
    return readFileSync(opts.notesFile, 'utf8').trim()
  }
  return gitNotesSinceLastTag()
}

const opts = parseArgs(process.argv.slice(2).filter((a) => a !== '--'))

requireTool('git', 'git --version')
requireTool('pnpm', 'pnpm --version')
if (!opts.packOnly) {
  requireTool('GitHub CLI', 'gh --version')
}

let pkg = readPkg()
if (opts.bump) {
  const next = bumpVersion(pkg.version, opts.bump)
  console.log(`版本: ${pkg.version} → ${next}`)
  pkg.version = next
  if (!opts.dryRun) {
    writePkg(pkg)
    try {
      if (existsSync(sitePkgPath)) {
        const sitePkg = JSON.parse(readFileSync(sitePkgPath, 'utf8'))
        sitePkg.version = next
        writeFileSync(sitePkgPath, `${JSON.stringify(sitePkg, null, 4)}\n`, 'utf8')
      }
    } catch (e) {
      console.error('Failed to sync apps/site/package.json:', e)
    }
  }
  if (opts.commit && !opts.dryRun) {
    run(`git add "${pkgPath}" "${sitePkgPath}"`)
    run(`git commit -m "chore(release): bump version to v${pkg.version}"`)
  } else if (opts.bump && !opts.dryRun && isPkgDirty()) {
    console.warn(
      '\n警告: package.json 已改版本但未 commit。建议加 --commit，或手动 commit 后再打 tag。\n',
    )
  }
}

const version = pkg.version
const tag = tagName(version)

if (!opts.skipBuild) {
  run('pnpm run build', { dryRun: opts.dryRun })
}

run('pnpm --filter @change-dark/chrome run pack', { dryRun: opts.dryRun })

if (opts.packOnly) {
  console.log(`\n完成 pack-only: ${zipPath}`)
  process.exit(0)
}

if (!opts.dryRun && !existsSync(zipPath)) {
  console.error(`ZIP 不存在: ${zipPath}`)
  process.exit(1)
}

const notes = resolveNotes(opts)

if (!opts.skipTag) {
  if (tagExists(tag, opts.dryRun)) {
    console.error(`tag 已存在: ${tag}（换版本或删 tag 后重试）`)
    process.exit(1)
  }
  run(`git tag -a "${tag}" -m "Release ${tag}"`, { dryRun: opts.dryRun })
}

if (!opts.skipPush && !opts.skipTag) {
  run('git push origin HEAD', { dryRun: opts.dryRun })
  run(`git push origin "${tag}"`, { dryRun: opts.dryRun })
}

const notesPath = join(mkdtempSync(join(tmpdir(), 'change-dark-release-')), 'notes.md')
if (!opts.dryRun) writeFileSync(notesPath, `${notes}\n`, 'utf8')

const ghCmd = [
  'gh release create',
  `"${tag}"`,
  `"${zipPath}"`,
  `--title "${tag}"`,
  opts.dryRun ? `--notes "${notes.replace(/"/g, '\\"')}"` : `--notes-file "${notesPath}"`,
].join(' ')

run(ghCmd, { dryRun: opts.dryRun })

console.log(`\n完成。Release: ${tag}`)
if (opts.dryRun) console.log('（dry-run，未实际执行）')
