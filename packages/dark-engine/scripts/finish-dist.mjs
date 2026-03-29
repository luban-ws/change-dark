/**
 * Vite 产出 ESM 与 sourcemap 后：写入对外唯一的类型入口与 CJS 桥（WASM 已内联进 index.mjs）。
 */
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const distMjs = resolve(dist, 'index.mjs')
const typesSrc = resolve(root, 'pkg/dark_engine.d.ts')
const typesDest = resolve(dist, 'index.d.ts')
const distCjs = resolve(dist, 'index.cjs')
if (!existsSync(distMjs)) {
  console.error('[finish-dist] missing dist/index.mjs; run vite build first')
  process.exit(1)
}
if (!existsSync(typesSrc)) {
  console.error('[finish-dist] missing pkg/dark_engine.d.ts; run wasm-pack first')
  process.exit(1)
}

copyFileSync(typesSrc, typesDest)

const bridge = `'use strict'

const { pathToFileURL } = require('node:url')
const { resolve: pathResolve } = require('node:path')

// require() → Promise（WASM + top-level await 无法做成同步 CJS）
module.exports = import(pathToFileURL(pathResolve(__dirname, 'index.mjs')).href)
`

writeFileSync(distCjs, bridge, 'utf8')
