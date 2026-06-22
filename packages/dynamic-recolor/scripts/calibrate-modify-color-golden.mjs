#!/usr/bin/env node
/**
 * RFC 031 §2.7：从 Rust 真源校验 / 再生成 golden fixture。
 *
 * live `darkreader` npm 不导出 `modifyColor`；向量以 `dark-color-utils` 为准。
 *
 * 用法（须在 `packages/dynamic-recolor` 目录，以便 WASM 模块解析）：
 *   cd packages/dynamic-recolor && node scripts/calibrate-modify-color-golden.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
const fixturePath = join(
  __dirname,
  '../src/__tests__/fixtures/modify-color-golden.json',
)

const cargo = spawnSync(
  'cargo',
  ['test', 'golden_vectors_rfc_027', '--', '--nocapture'],
  {
    cwd: join(repoRoot, 'packages/dark-color-utils'),
    encoding: 'utf8',
  },
)

if (cargo.status !== 0) {
  console.error(cargo.stderr || cargo.stdout)
  process.exit(cargo.status ?? 1)
}

console.log('Rust golden_vectors_rfc_027: OK')

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
const eng = await import('@change-dark/dark-engine')
if (eng.__tla) await eng.__tla
const { modifyColorRgb, COLOR_USE_BG, COLOR_USE_FG, COLOR_USE_BORDER } = eng
const useTag = {
  bg: COLOR_USE_BG,
  fg: COLOR_USE_FG,
  border: COLOR_USE_BORDER,
}

let mismatches = 0
for (const row of fixture.vectors) {
  const [r, g, b] = row.rgb
  const out = modifyColorRgb(r, g, b, useTag[row.use])
  const hex = `#${[out[0], out[1], out[2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  if (hex !== row.expected) {
    mismatches += 1
    console.warn(`MISMATCH ${row.input} (${row.use}): fixture=${row.expected} wasm=${hex}`)
    row.expected = hex
  }
}

if (mismatches > 0) {
  writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  console.log(`Updated ${fixturePath} (${mismatches} row(s))`)
} else {
  console.log(`Fixture matches WASM: ${fixturePath}`)
}
