#!/usr/bin/env node
/** RFC 026：为 Playwright 提供本地 fixture 静态页。 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAGES_DIR = path.join(__dirname, 'pages')
const PORT = Number(process.env.E2E_FIXTURE_PORT ?? 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
}

const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] ?? '/'
  const rel = urlPath === '/' ? '/index.html' : urlPath
  const filePath = path.join(PAGES_DIR, rel)

  if (!filePath.startsWith(PAGES_DIR)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
    res.end(data)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[e2e-fixtures] http://127.0.0.1:${PORT}`)
})
