#!/usr/bin/env node
/**
 * Formats `apps/chrome/test-results/perf-report.json` as a Markdown table
 * and appends it to `$GITHUB_STEP_SUMMARY` when running in GitHub Actions.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME_DIR = path.resolve(__dirname, '..')
const REPORT_PATH = path.join(CHROME_DIR, 'test-results/perf-report.json')

if (!fs.existsSync(REPORT_PATH)) {
  console.log(`[perf:summary] No perf report found at ${REPORT_PATH}`)
  process.exit(0)
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'))
const b = report.budgets ?? {}
const s = report.staticMetrics ?? {}
const w = report.warmMedian ?? {}
const warmRuns = Array.isArray(report.warmRuns) ? report.warmRuns : []
const cold = report.coldRun ?? {}

function fmtKb(bytes) {
  return typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} KB` : '—'
}

function fmtMs(ms) {
  return typeof ms === 'number' ? `${ms} ms` : '—'
}

function statusLe(actual, limit) {
  if (typeof actual !== 'number' || typeof limit !== 'number') return '—'
  return actual <= limit ? 'PASS' : 'FAIL'
}

function statusLt(actual, limit) {
  if (typeof actual !== 'number' || typeof limit !== 'number') return '—'
  return actual < limit ? 'PASS' : 'FAIL'
}

function statusEq(actual, expected) {
  if (typeof actual !== 'number' || typeof expected !== 'number') return '—'
  return actual === expected ? 'PASS' : 'FAIL'
}

const maxWarmStorageGets = warmRuns.length
  ? Math.max(...warmRuns.map((r) => r.storageGets ?? 0))
  : undefined
const maxWarmTabQueries = warmRuns.length
  ? Math.max(...warmRuns.map((r) => r.tabQueries ?? 0))
  : undefined
const maxWarmStorageSets = warmRuns.length
  ? Math.max(...warmRuns.map((r) => r.storageSets ?? 0))
  : undefined

const rows = [
  ['Popup Entry HTML', fmtKb(s.entryHtmlBytes), `<= ${fmtKb(b.static?.maxEntryHtmlBytes)}`, statusLe(s.entryHtmlBytes, b.static?.maxEntryHtmlBytes)],
  ['Popup Entry JS (`async`)', fmtKb(s.entryScriptBytes), `<= ${fmtKb(b.static?.maxEntryScriptBytes)}`, statusLe(s.entryScriptBytes, b.static?.maxEntryScriptBytes)],
  ['Pruned Popup CSS', fmtKb(s.cssBytes), `<= ${fmtKb(b.static?.maxCssBytes)}`, statusLe(s.cssBytes, b.static?.maxCssBytes)],
  ['Popup Async UI JS', fmtKb(s.popupAsyncJsBytes), `<= ${fmtKb(b.static?.maxPopupAsyncJsBytes)}`, statusLe(s.popupAsyncJsBytes, b.static?.maxPopupAsyncJsBytes)],
  ['Content Script JS', fmtKb(s.contentScriptBytes), `<= ${fmtKb(b.static?.maxContentScriptBytes)}`, statusLe(s.contentScriptBytes, b.static?.maxContentScriptBytes)],
  ['dark-engine WASM Copies', s.darkEngineWasmDataUrls ?? '—', `= ${b.static?.maxDarkEngineWasmDataUrls ?? '—'}`, statusEq(s.darkEngineWasmDataUrls, b.static?.maxDarkEngineWasmDataUrls)],
  ['Warm p50 DCL', fmtMs(w.dcl), `< ${fmtMs(b.runtime?.maxWarmMedianDclMs)}`, statusLt(w.dcl, b.runtime?.maxWarmMedianDclMs)],
  ['Warm p50 Load', fmtMs(w.load), `< ${fmtMs(b.runtime?.maxWarmMedianLoadMs)}`, statusLt(w.load, b.runtime?.maxWarmMedianLoadMs)],
  ['Warm p50 FCP', fmtMs(w.fcp), `< ${fmtMs(b.runtime?.maxWarmMedianFcpMs)}`, statusLt(w.fcp, b.runtime?.maxWarmMedianFcpMs)],
  ['Warm p50 Full UI', fmtMs(w.fullUI), `< ${fmtMs(b.runtime?.maxWarmMedianFullUiMs)}`, statusLt(w.fullUI, b.runtime?.maxWarmMedianFullUiMs)],
  ['Cold Storage `get` IPC', cold.storageGets ?? '—', `<= ${b.runtime?.maxColdStorageGets ?? '—'}`, statusLe(cold.storageGets, b.runtime?.maxColdStorageGets)],
  ['Warm Storage `get` IPC / Open', maxWarmStorageGets ?? '—', `= ${b.runtime?.expectedStorageGets ?? '—'}`, statusEq(maxWarmStorageGets, b.runtime?.expectedStorageGets)],
  ['Warm Tab `query` IPC / Open', maxWarmTabQueries ?? '—', `= ${b.runtime?.expectedTabQueries ?? '—'}`, statusEq(maxWarmTabQueries, b.runtime?.expectedTabQueries)],
  ['Warm Storage `set` Count', maxWarmStorageSets ?? '—', `<= ${b.runtime?.maxWarmStorageSets ?? '—'}`, statusLe(maxWarmStorageSets, b.runtime?.maxWarmStorageSets)],
]

const md = [
  '## Chrome Popup Performance Report',
  '',
  `Warm runs: **${warmRuns.length}** | Cold run: DCL=${fmtMs(cold.dcl)}, Load=${fmtMs(cold.load)}, FCP=${fmtMs(cold.fcp)}, FullUI=${fmtMs(cold.fullUI)}`,
  '',
  '| Metric | Measured | Budget | Status |',
  '|--------|----------|--------|--------|',
  ...rows.map(([metric, measured, budget, status]) => `| ${metric} | ${measured} | ${budget} | ${status} |`),
  '',
].join('\n')

console.log(md)

const summaryFile = process.env.GITHUB_STEP_SUMMARY
if (summaryFile) {
  fs.appendFileSync(summaryFile, `${md}\n`, 'utf8')
}
